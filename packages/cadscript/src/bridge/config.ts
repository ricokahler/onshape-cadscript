import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const BRIDGE_PROTOCOL_VERSION = 1;
export const BRIDGE_PORT = 27183;
export const BRIDGE_HOST_NAME = "com.ricokahler.onshape_cadscript";
export const MAX_BRIDGE_PAYLOAD_BYTES = 8 * 1024 * 1024;

export interface BridgeConfig {
  readonly protocolVersion: number;
  readonly port: number;
  readonly token: string;
  readonly extensionIds: readonly string[];
}

export function bridgeDirectory(): string {
  return join(homedir(), "Library", "Application Support", "onshape-cadscript");
}

export function bridgeConfigPath(): string {
  return join(bridgeDirectory(), "bridge.json");
}

export async function readBridgeConfig(): Promise<BridgeConfig> {
  const config = JSON.parse(await readFile(bridgeConfigPath(), "utf8")) as BridgeConfig;
  if (config.protocolVersion !== BRIDGE_PROTOCOL_VERSION)
    throw new Error(
      `Bridge protocol ${config.protocolVersion} is not supported by this CadScript version`,
    );
  return config;
}

export async function ensureBridgeConfig(
  extensionIds: readonly string[] = [],
): Promise<BridgeConfig> {
  await mkdir(bridgeDirectory(), { recursive: true, mode: 0o700 });
  try {
    const current = await readBridgeConfig();
    const merged = [...new Set([...current.extensionIds, ...extensionIds])];
    if (merged.length === current.extensionIds.length) return current;
    const updated = { ...current, extensionIds: merged };
    await writeFile(bridgeConfigPath(), `${JSON.stringify(updated, null, 2)}\n`, { mode: 0o600 });
    return updated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const config: BridgeConfig = {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      port: BRIDGE_PORT,
      token: randomBytes(32).toString("base64url"),
      extensionIds: [...new Set(extensionIds)],
    };
    await writeFile(bridgeConfigPath(), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    await chmod(bridgeConfigPath(), 0o600);
    return config;
  }
}
