import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BRIDGE_HOST_NAME, bridgeDirectory, ensureBridgeConfig } from "./config.js";

const CHROME_MANIFEST_DIRECTORIES = [
  join(homedir(), "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts"),
  join(homedir(), "Library", "Application Support", "Chromium", "NativeMessagingHosts"),
];

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function nativeHostEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "native-host.js");
}

export async function installBridge(
  extensionId: string,
): Promise<{ manifests: string[]; wrapper: string }> {
  if (!/^[a-p]{32}$/.test(extensionId))
    throw new Error("Chrome extension ID must be 32 lowercase letters from a through p");
  await ensureBridgeConfig([extensionId]);
  const directory = bridgeDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const wrapper = join(directory, "native-host.sh");
  await writeFile(
    wrapper,
    `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(nativeHostEntry())}\n`,
    { mode: 0o700 },
  );
  await chmod(wrapper, 0o700);

  const manifest = {
    name: BRIDGE_HOST_NAME,
    description: "Local bridge between Onshape CadScript and the user's signed-in Chrome session",
    path: wrapper,
    type: "stdio",
    allowed_origins: [`chrome-extension://${extensionId}/`],
  };
  const manifests: string[] = [];
  for (const targetDirectory of CHROME_MANIFEST_DIRECTORIES) {
    await mkdir(targetDirectory, { recursive: true });
    const path = join(targetDirectory, `${BRIDGE_HOST_NAME}.json`);
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    manifests.push(path);
  }
  return { manifests, wrapper };
}

export async function uninstallBridge(): Promise<void> {
  for (const targetDirectory of CHROME_MANIFEST_DIRECTORIES) {
    await rm(join(targetDirectory, `${BRIDGE_HOST_NAME}.json`), { force: true });
  }
  await rm(join(bridgeDirectory(), "native-host.sh"), { force: true });
}
