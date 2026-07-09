import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { BridgeTransport } from "./bridge/client.js";
import { BRIDGE_HOST_NAME, bridgeConfigPath, readBridgeConfig } from "./bridge/config.js";

export interface DoctorCheck {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
  readonly fix?: string;
}

export interface DoctorReport {
  readonly ok: boolean;
  readonly checks: readonly DoctorCheck[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function runDoctor(): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  checks.push({
    name: "runtime",
    ok: Number(process.versions.node.split(".")[0]) >= 22,
    detail: `Node ${process.versions.node} on ${process.platform}/${process.arch}`,
    fix: "Install Node.js 22.14 or newer.",
  });
  checks.push({
    name: "platform",
    ok: process.platform === "darwin",
    detail:
      process.platform === "darwin"
        ? "macOS is supported"
        : `${process.platform} is not supported in v0.1`,
    fix: "Use macOS with Google Chrome for v0.1.",
  });

  try {
    const config = await readBridgeConfig();
    checks.push({
      name: "bridge-config",
      ok: config.extensionIds.length > 0,
      detail: `${bridgeConfigPath()} (${config.extensionIds.length} extension ID${config.extensionIds.length === 1 ? "" : "s"})`,
      fix: "Run cadscript bridge install --extension-id <chrome-extension-id>.",
    });
  } catch (error) {
    checks.push({
      name: "bridge-config",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
      fix: "Run cadscript bridge install --extension-id <chrome-extension-id>.",
    });
  }

  const manifest = join(
    homedir(),
    "Library",
    "Application Support",
    "Google",
    "Chrome",
    "NativeMessagingHosts",
    `${BRIDGE_HOST_NAME}.json`,
  );
  checks.push({
    name: "native-host",
    ok: await exists(manifest),
    detail: manifest,
    fix: "Run cadscript bridge install --extension-id <chrome-extension-id>.",
  });

  try {
    const health = await new BridgeTransport(3_000).health();
    const tabs = Number(health.onshapeTabCount ?? 0);
    checks.push({
      name: "browser-bridge",
      ok: tabs > 0,
      detail: `Bridge connected; ${tabs} Onshape tab${tabs === 1 ? "" : "s"} visible`,
      fix: "Open a signed-in Onshape document in Chrome.",
    });
  } catch (error) {
    checks.push({
      name: "browser-bridge",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
      fix: "Install the extension, restart Chrome, and open an Onshape document.",
    });
  }

  return { ok: checks.every((check) => check.ok), checks };
}

export function formatDoctor(report: DoctorReport): string {
  return report.checks
    .map(
      (check) =>
        `${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.detail}${!check.ok && check.fix ? `\n     Fix: ${check.fix}` : ""}`,
    )
    .join("\n");
}
