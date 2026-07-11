import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CADSCRIPT_CHROME_EXTENSION_ID,
  CADSCRIPT_CHROME_EXTENSION_PUBLIC_KEY,
  extensionIdFromPublicKey,
  installChromeExtension,
} from "./chrome.js";

const temporaryDirectories: string[] = [];
const sourceDirectory = resolve(import.meta.dirname, "../../../../extension/chrome");

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("local Chrome extension", () => {
  it("keeps the manifest and native-host extension IDs stable", async () => {
    const manifest = JSON.parse(await readFile(join(sourceDirectory, "manifest.json"), "utf8")) as {
      key: string;
    };
    expect(manifest.key).toBe(CADSCRIPT_CHROME_EXTENSION_PUBLIC_KEY);
    expect(extensionIdFromPublicKey(manifest.key)).toBe(CADSCRIPT_CHROME_EXTENSION_ID);
    expect(CADSCRIPT_CHROME_EXTENSION_ID).toBe("bphhdaecfhpcdolonkggihamebhbglbj");
  });

  it("installs an update into one version-independent directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "cadscript-chrome-test-"));
    temporaryDirectories.push(root);
    const destination = join(root, "chrome-extension");
    const result = await installChromeExtension({
      sourceDirectory,
      installDirectory: destination,
    });
    const manifest = JSON.parse(await readFile(join(destination, "manifest.json"), "utf8")) as {
      key: string;
    };
    expect(result).toEqual({
      directory: destination,
      extensionId: CADSCRIPT_CHROME_EXTENSION_ID,
    });
    expect(manifest.key).toBe(CADSCRIPT_CHROME_EXTENSION_PUBLIC_KEY);
  });

  it("keeps one native port alive across install and startup events", async () => {
    const worker = await readFile(join(sourceDirectory, "service-worker.js"), "utf8");
    expect(worker).toContain("if (nativePort) return;");
    expect(worker).toContain("const port = chrome.runtime.connectNative(HOST_NAME);");
    expect(worker).toContain("if (nativePort === port)");
    expect(worker).toContain("if (response) port.postMessage(response);");
  });
});
