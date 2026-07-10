import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { bridgeDirectory } from "./bridge/config.js";
import { CADSCRIPT_VERSION } from "./version.js";

const exec = promisify(execFile);
const PROCESS_NAME = "onshape-cadscript";
const PM2_PACKAGE = "pm2@7.0.3";

export interface DaemonOptions {
  readonly host?: string;
  readonly port?: number;
}

export interface DaemonStatus {
  readonly installed: boolean;
  readonly name: string;
  readonly status?: string;
  readonly pid?: number;
  readonly restarts?: number;
  readonly endpoint?: string;
  readonly version?: string;
}

function daemonConfigPath(): string {
  return join(bridgeDirectory(), "daemon.json");
}

function daemonLauncherPath(): string {
  return join(bridgeDirectory(), "daemon.mjs");
}

async function commandPath(command: string): Promise<string | undefined> {
  try {
    return (await exec("which", [command])).stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function runPm2(
  args: string[],
  installIfMissing = true,
): Promise<{ stdout: string; stderr: string }> {
  const pm2 = await commandPath("pm2");
  if (pm2) return exec(pm2, args, { maxBuffer: 8 * 1024 * 1024 });
  if (!installIfMissing) throw new Error("PM2 is not installed");
  const npx = await commandPath("npx");
  if (!npx) throw new Error("PM2 requires npm/npx. Install Node.js 22 or newer first.");
  return exec(npx, ["-y", PM2_PACKAGE, ...args], { maxBuffer: 8 * 1024 * 1024 });
}

async function savePm2State(): Promise<void> {
  await runPm2(["save", "--force"]);
}

export async function daemonStatus(): Promise<DaemonStatus> {
  let stdout: string;
  try {
    ({ stdout } = await runPm2(["jlist"], false));
  } catch {
    return { installed: false, name: PROCESS_NAME };
  }
  const processes = JSON.parse(stdout) as Array<{
    name?: string;
    pid?: number;
    pm2_env?: {
      status?: string;
      restart_time?: number;
      env?: { CADSCRIPT_DAEMON_ENDPOINT?: string; CADSCRIPT_VERSION?: string };
    };
  }>;
  const process = processes.find((candidate) => candidate.name === PROCESS_NAME);
  if (!process) return { installed: false, name: PROCESS_NAME };
  let config: { endpoint?: string; version?: string } = {};
  try {
    config = JSON.parse(await readFile(daemonConfigPath(), "utf8")) as typeof config;
  } catch {
    // PM2 state remains useful even if the local metadata was removed manually.
  }
  return {
    installed: true,
    name: PROCESS_NAME,
    ...(process.pm2_env?.status ? { status: process.pm2_env.status } : {}),
    ...(process.pid ? { pid: process.pid } : {}),
    ...(process.pm2_env?.restart_time !== undefined
      ? { restarts: process.pm2_env.restart_time }
      : {}),
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    ...(config.version ? { version: config.version } : {}),
  };
}

async function waitForHealth(endpoint: string): Promise<void> {
  const url = `${endpoint.replace(/\/mcp$/, "")}/healthz`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = new Error(`Health check returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `PM2 started ${PROCESS_NAME}, but ${url} did not become healthy: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export async function installDaemon(options: DaemonOptions = {}): Promise<DaemonStatus> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 27_184;
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    throw new Error("Daemon port must be an integer from 1 through 65535");
  if (!["127.0.0.1", "localhost", "::1"].includes(host))
    throw new Error("The CadScript daemon only binds to a loopback host");

  const npx = await commandPath("npx");
  if (!npx) throw new Error("CadScript daemon installation requires npm/npx");
  const endpoint = `http://${host.includes(":") ? `[${host}]` : host}:${port}/mcp`;
  await mkdir(bridgeDirectory(), { recursive: true, mode: 0o700 });
  await writeFile(
    daemonLauncherPath(),
    [
      'import { spawn } from "node:child_process";',
      `const child = spawn(${JSON.stringify(npx)}, ${JSON.stringify([
        "-y",
        `onshape-cadscript@${CADSCRIPT_VERSION}`,
        "mcp",
        "--http",
        "--host",
        host,
        "--port",
        String(port),
      ])}, { stdio: "inherit" });`,
      'for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));',
      'child.on("error", (error) => { console.error(error); process.exit(1); });',
      'child.on("exit", (code, signal) => process.exitCode = code ?? (signal ? 1 : 0));',
      "",
    ].join("\n"),
    { mode: 0o700 },
  );
  await writeFile(
    daemonConfigPath(),
    `${JSON.stringify({ host, port, endpoint, version: CADSCRIPT_VERSION }, null, 2)}\n`,
    { mode: 0o600 },
  );

  if ((await daemonStatus()).installed) await runPm2(["delete", PROCESS_NAME]);
  await runPm2([
    "start",
    daemonLauncherPath(),
    "--name",
    PROCESS_NAME,
    "--interpreter",
    process.execPath,
    "--time",
    "--update-env",
  ]);
  await savePm2State();
  await waitForHealth(endpoint);
  const status = await daemonStatus();
  return { ...status, endpoint, version: CADSCRIPT_VERSION };
}

export async function uninstallDaemon(): Promise<boolean> {
  const installed = (await daemonStatus()).installed;
  if (installed) {
    await runPm2(["delete", PROCESS_NAME], false);
    await savePm2State();
  }
  await rm(daemonLauncherPath(), { force: true });
  await rm(daemonConfigPath(), { force: true });
  return installed;
}

export async function daemonLogs(lines = 100): Promise<string> {
  if (!(await daemonStatus()).installed) throw new Error("CadScript daemon is not installed");
  const { stdout, stderr } = await runPm2([
    "logs",
    PROCESS_NAME,
    "--lines",
    String(lines),
    "--nostream",
    "--raw",
  ]);
  return `${stdout}${stderr}`;
}
