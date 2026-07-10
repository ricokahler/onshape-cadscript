#!/usr/bin/env node
import { execFile, spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import { Command } from "commander";
import { BridgeTransport } from "./bridge/client.js";
import { CADSCRIPT_CHROME_EXTENSION_ID, installChromeExtension } from "./bridge/chrome.js";
import { chromeExtensionDirectory } from "./bridge/chrome.js";
import { bridgeDirectory } from "./bridge/config.js";
import { installBridge, uninstallBridge } from "./bridge/install.js";
import { materializeModel } from "./core/model.js";
import { daemonLogs, daemonStatus, installDaemon, uninstallDaemon } from "./daemon.js";
import { renderSketchPng, renderSketchSvg } from "./core/preview.js";
import { formatDoctor, runDoctor } from "./doctor.js";
import { startMcpHttpServer, startMcpServer } from "./mcp.js";
import { OnshapeClient } from "./onshape/client.js";
import { applyPlan, createPlan, planSummary, readPlan, writePlan } from "./runtime/planner.js";
import { loadProject, readProjectState, writeStarterProject } from "./runtime/project.js";
import { CADSCRIPT_VERSION } from "./version.js";

function client(): OnshapeClient {
  return new OnshapeClient(new BridgeTransport());
}

const exec = promisify(execFile);

async function loadedModel(cwd: string) {
  const project = await loadProject(cwd);
  const model = await materializeModel(project.model, project.config.parameters as never);
  return { project, model };
}

function targetOrThrow(target: unknown) {
  if (!target)
    throw new Error(
      "cadscript.config.ts needs a target with documentId, workspaceId, and elementId",
    );
  return target as { documentId: string; workspaceId: string; elementId: string };
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${command} exited with code ${code}`)),
    );
  });
}

const program = new Command()
  .name("cadscript")
  .description("Script-first Onshape CAD for Codex and hobby 3D printing")
  .version(CADSCRIPT_VERSION);

program
  .command("init")
  .argument("[directory]", "project directory", ".")
  .option("--name <name>", "model name")
  .action(async (directory, options) => {
    const root = resolve(directory);
    await writeStarterProject(root, options.name ?? basename(root));
    process.stdout.write(`Created CadScript project in ${root}\n`);
  });

program
  .command("doctor")
  .option("--json", "print machine-readable output")
  .action(async (options) => {
    const report = await runDoctor();
    process.stdout.write(
      options.json ? `${JSON.stringify(report, null, 2)}\n` : `${formatDoctor(report)}\n`,
    );
    if (!report.ok) process.exitCode = 1;
  });

const bridge = program.command("bridge").description("Manage the Chrome native messaging bridge");
bridge
  .command("install")
  .option("--extension-id <id>", "Chrome extension ID", CADSCRIPT_CHROME_EXTENSION_ID)
  .action(async (options) => {
    const result = await installBridge(options.extensionId);
    process.stdout.write(
      `Installed native host wrapper at ${result.wrapper}\n${result.manifests.join("\n")}\n`,
    );
  });
bridge.command("uninstall").action(async () => {
  await uninstallBridge();
  process.stdout.write("Removed the CadScript native host manifests.\n");
});

const daemon = program.command("daemon").description("Manage the optional PM2 MCP daemon");
daemon
  .command("install")
  .option("--host <host>", "loopback host", "127.0.0.1")
  .option("--port <port>", "MCP HTTP port", "27184")
  .option("--codex", "register the HTTP endpoint in the user's Codex config")
  .action(async (options) => {
    const status = await installDaemon({ host: options.host, port: Number(options.port) });
    if (options.codex) {
      await exec("codex", ["mcp", "remove", "onshape-cadscript-daemon"]).catch(() => undefined);
      await run("codex", ["mcp", "add", "onshape-cadscript-daemon", "--url", status.endpoint!]);
    }
    process.stdout.write(
      [
        `Installed ${status.name} with PM2 (${status.status ?? "unknown"}, pid ${status.pid ?? "unknown"}).`,
        `MCP endpoint: ${status.endpoint}`,
        "Run `pm2 startup` once if you want PM2 to restore saved processes after login/reboot.",
      ].join("\n") + "\n",
    );
  });
daemon
  .command("status")
  .option("--json", "print JSON")
  .action(async (options) => {
    const status = await daemonStatus();
    process.stdout.write(
      options.json
        ? `${JSON.stringify(status, null, 2)}\n`
        : status.installed
          ? `${status.name}: ${status.status ?? "unknown"} (pid ${status.pid ?? "unknown"})${status.endpoint ? `\n${status.endpoint}` : ""}\n`
          : `${status.name}: not installed\n`,
    );
  });
daemon
  .command("logs")
  .option("--lines <count>", "number of lines", "100")
  .action(async (options) => {
    process.stdout.write(await daemonLogs(Number(options.lines)));
  });
daemon
  .command("uninstall")
  .option("--codex", "remove the daemon endpoint from Codex")
  .action(async (options) => {
    const removed = await uninstallDaemon();
    if (options.codex)
      await exec("codex", ["mcp", "remove", "onshape-cadscript-daemon"]).catch(() => undefined);
    process.stdout.write(
      removed ? "Removed the CadScript PM2 daemon.\n" : "CadScript PM2 daemon was not installed.\n",
    );
  });

const setup = program.command("setup").description("Install integrations");
setup.command("codex").action(async () => {
  await run("codex", [
    "plugin",
    "marketplace",
    "add",
    "ricokahler/onshape-cadscript",
    "--sparse",
    ".agents/plugins",
  ]);
  await run("codex", ["plugin", "marketplace", "upgrade", "onshape-cadscript"]);
  await run("codex", ["plugin", "add", "onshape-cadscript@onshape-cadscript"]);
  const { stdout } = await exec("codex", ["plugin", "list"]);
  const installedPlugin = stdout
    .split("\n")
    .find((line) => line.includes("onshape-cadscript@onshape-cadscript"));
  if (!installedPlugin?.includes(CADSCRIPT_VERSION)) {
    throw new Error(
      `Codex did not report Onshape CadScript ${CADSCRIPT_VERSION} after installation`,
    );
  }
  process.stdout.write(
    "Installed the Onshape CadScript Codex plugin. Run cadscript setup chrome next.\n",
  );
});
setup
  .command("chrome")
  .description("Prepare the local unpacked Chrome extension and native host")
  .option("--no-open", "do not open Chrome and Finder")
  .action(async (options) => {
    const extension = await installChromeExtension();
    const nativeHost = await installBridge(extension.extensionId);
    if (options.open) {
      await run("open", [extension.directory]);
      await run("open", ["-a", "Google Chrome", "chrome://extensions"]);
    }
    process.stdout.write(
      [
        `Prepared the unpacked extension at ${extension.directory}`,
        `Stable extension ID: ${extension.extensionId}`,
        `Installed native host wrapper at ${nativeHost.wrapper}`,
        "In chrome://extensions, enable Developer mode, click Load unpacked, and select the prepared directory.",
        "Then open a signed-in Onshape document and run cadscript doctor --json.",
      ].join("\n") + "\n",
    );
  });

program
  .command("inspect")
  .option("--cwd <path>", "project directory", process.cwd())
  .action(async (options) => {
    const { project, model } = await loadedModel(options.cwd);
    process.stdout.write(
      `${JSON.stringify({ root: project.root, config: project.config, model }, null, 2)}\n`,
    );
  });

program
  .command("preview")
  .option("--cwd <path>", "project directory", process.cwd())
  .option("--sketch <id>", "sketch feature ID")
  .option("--format <format>", "svg or png", "svg")
  .option("--out <path>", "output file")
  .action(async (options) => {
    const { project, model } = await loadedModel(options.cwd);
    const format = options.format === "png" ? "png" : "svg";
    const output = resolve(options.out ?? `${project.root}/preview.${format}`);
    await writeFile(
      output,
      format === "png"
        ? renderSketchPng(model, options.sketch)
        : renderSketchSvg(model, options.sketch),
    );
    process.stdout.write(`${output}\n`);
  });

program
  .command("plan")
  .option("--cwd <path>", "project directory", process.cwd())
  .option("--adopt", "adopt an existing fully CadScript-owned Part Studio")
  .option("--json", "print the complete plan")
  .action(async (options) => {
    const { project, model } = await loadedModel(options.cwd);
    const target = targetOrThrow(project.config.target);
    const observation = await client().observe(target);
    const plan = createPlan(model, target, observation, await readProjectState(project.root), {
      adopt: options.adopt,
    });
    const path = await writePlan(project.root, plan);
    process.stdout.write(
      options.json ? `${JSON.stringify(plan, null, 2)}\n` : `${planSummary(plan)}\nSaved ${path}\n`,
    );
  });

program
  .command("apply")
  .argument("<plan-id>", "exact plan ID returned by cadscript plan")
  .option("--cwd <path>", "project directory", process.cwd())
  .action(async (planId, options) => {
    const { project, model } = await loadedModel(options.cwd);
    const plan = await readPlan(project.root, planId);
    const result = await applyPlan(client(), project.root, model, plan);
    process.stdout.write(
      `Applied ${plan.planId}; verified ${result.observation.features.length} clean features and a no-op next plan.\n`,
    );
  });

program
  .command("render")
  .option("--cwd <path>", "project directory", process.cwd())
  .option("--view <view>", "view preset", "isometric")
  .option("--out <path>", "PNG output file", "render.png")
  .action(async (options) => {
    const { project } = await loadedModel(options.cwd);
    const images = await client().render(targetOrThrow(project.config.target), {
      view: options.view,
    });
    if (!images[0]) throw new Error("Onshape returned no rendered image");
    const output = resolve(options.out);
    await writeFile(output, Buffer.from(images[0], "base64"));
    process.stdout.write(`${output}\n`);
  });

program
  .command("measure")
  .option("--cwd <path>", "project directory", process.cwd())
  .action(async (options) => {
    const { project } = await loadedModel(options.cwd);
    const result = await client().evaluateFeatureScript(
      targetOrThrow(project.config.target),
      'function(context is Context, queries is map) { return { "bounds": evBox3d(context, { "topology": qEverything(EntityType.BODY), "tight": true }), "mass": evApproximateMassProperties(context, { "entities": qEverything(EntityType.BODY) }) }; }',
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  });

program
  .command("export")
  .argument("<format>", "export format (stl)")
  .option("--cwd <path>", "project directory", process.cwd())
  .option("--out <path>", "output file")
  .action(async (format, options) => {
    if (format !== "stl") throw new Error("v0.1 supports only STL export");
    const { project, model } = await loadedModel(options.cwd);
    const stl = await client().exportStl(targetOrThrow(project.config.target));
    if (!stl.includes("solid") || stl.length < 100)
      throw new Error("Onshape returned an empty or invalid STL");
    const output = resolve(options.out ?? `${model.name}.stl`);
    await writeFile(output, stl);
    process.stdout.write(`${output} (${Buffer.byteLength(stl)} bytes)\n`);
  });

program
  .command("mcp")
  .option("--stdio", "use standard input/output transport")
  .option("--http", "serve streamable HTTP on localhost")
  .option("--host <host>", "HTTP host", "127.0.0.1")
  .option("--port <port>", "HTTP port", "27184")
  .action(async (options) => {
    if (options.http) await startMcpHttpServer({ host: options.host, port: Number(options.port) });
    else await startMcpServer();
  });

program
  .command("uninstall")
  .description("Remove the daemon, native host, and prepared local extension files")
  .option("--keep-config", "preserve the owner-only bridge token and configuration")
  .action(async (options) => {
    await uninstallDaemon();
    await exec("codex", ["mcp", "remove", "onshape-cadscript-daemon"]).catch(() => undefined);
    await uninstallBridge();
    await rm(chromeExtensionDirectory(), { recursive: true, force: true });
    if (!options.keepConfig) await rm(bridgeDirectory(), { recursive: true, force: true });
    process.stdout.write(
      [
        "Removed CadScript's PM2 daemon, native host, and prepared extension files.",
        "Remove the Onshape CadScript card from chrome://extensions to finish browser cleanup.",
      ].join("\n") + "\n",
    );
  });

program.parseAsync().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
