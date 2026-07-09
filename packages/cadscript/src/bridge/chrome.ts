import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bridgeDirectory } from "./config.js";

export const CADSCRIPT_CHROME_EXTENSION_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0jntLIv920UXY5YKv4sffFma5sgNh21kxXbkGpglVFQuDa4m7AeDOTCDvy3SKWTlqrX3/i7AAXzmAUi9Krl4Ppxc0T3At1GACXy8pabfzwqIXL7ZTnl1CnMWPvEMlsTIwp1NY1VSj1Wo0/w3rwOMkCOsnSk28IhigxWChPgTJiGAYnJT8m1pB1QUB2J9RajmgqqtPl/2upyI1j0gndtNbdfmYx/Hrb5Cpwgf1xQm1kCu43vFxVJ6geMHknuOXWu3KELiyEiulIG53aBZBFGaMvA5OwRYsHeKlMfaQXzXt/+81gs1vq0/8dhWkNdkk3tNIMcg9xjvin2a2ksqHaVJXwIDAQAB";

export function extensionIdFromPublicKey(publicKey: string): string {
  const bytes = Buffer.from(publicKey, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== publicKey)
    throw new Error("Chrome extension public key must be canonical base64");
  const hex = createHash("sha256").update(bytes).digest("hex").slice(0, 32);
  return [...hex]
    .map((character) => String.fromCharCode("a".charCodeAt(0) + Number.parseInt(character, 16)))
    .join("");
}

export const CADSCRIPT_CHROME_EXTENSION_ID = extensionIdFromPublicKey(
  CADSCRIPT_CHROME_EXTENSION_PUBLIC_KEY,
);

export function chromeExtensionDirectory(): string {
  return join(bridgeDirectory(), "chrome-extension");
}

function bundledChromeExtensionDirectory(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "extension", "chrome");
}

export interface InstallChromeExtensionOptions {
  readonly sourceDirectory?: string;
  readonly installDirectory?: string;
}

export interface ChromeExtensionInstall {
  readonly directory: string;
  readonly extensionId: string;
}

export async function installChromeExtension(
  options: InstallChromeExtensionOptions = {},
): Promise<ChromeExtensionInstall> {
  const source = options.sourceDirectory ?? bundledChromeExtensionDirectory();
  const destination = options.installDirectory ?? chromeExtensionDirectory();
  const manifest = JSON.parse(await readFile(join(source, "manifest.json"), "utf8")) as {
    key?: string;
  };
  if (manifest.key !== CADSCRIPT_CHROME_EXTENSION_PUBLIC_KEY)
    throw new Error("Bundled Chrome extension does not use the CadScript development key");

  await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  const staging = `${destination}.staging-${process.pid}`;
  await rm(staging, { recursive: true, force: true });
  try {
    await cp(source, staging, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
    await rename(staging, destination);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }

  return { directory: destination, extensionId: CADSCRIPT_CHROME_EXTENSION_ID };
}
