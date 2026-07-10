import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format, resolveConfig } from "prettier";

const root = resolve(import.meta.dirname, "..");

async function readJson(path: string): Promise<Record<string, any>> {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFormatted(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeFormatted(path: string, content: string): Promise<void> {
  const absolute = resolve(root, path);
  const prettierConfig = (await resolveConfig(absolute)) ?? {};
  await writeFile(absolute, await format(content, { ...prettierConfig, filepath: absolute }));
}

const sdkPackage = await readJson("packages/cadscript/package.json");
const pluginPackage = await readJson("plugins/onshape-cadscript/package.json");
const version = String(sdkPackage.version);

if (pluginPackage.version !== version) {
  throw new Error(
    `Fixed packages must share a version: SDK ${version}, plugin ${pluginPackage.version}`,
  );
}

const pluginManifest = await readJson("plugins/onshape-cadscript/.codex-plugin/plugin.json");
pluginManifest.version = version;
await writeJson("plugins/onshape-cadscript/.codex-plugin/plugin.json", pluginManifest);

const mcpConfig = await readJson("plugins/onshape-cadscript/.mcp.json");
mcpConfig.mcpServers["onshape-cadscript"].args = [
  "-y",
  `onshape-cadscript@${version}`,
  "mcp",
  "--stdio",
];
await writeJson("plugins/onshape-cadscript/.mcp.json", mcpConfig);

const marketplace = await readJson(".agents/plugins/marketplace.json");
marketplace.plugins[0].source.version = version;
await writeJson(".agents/plugins/marketplace.json", marketplace);

const chromeManifest = await readJson("extension/chrome/manifest.json");
chromeManifest.version = version;
await writeJson("extension/chrome/manifest.json", chromeManifest);

await writeFormatted(
  "packages/cadscript/src/version.ts",
  `// Updated by scripts/sync-versions.ts after Changesets versions the packages.\nexport const CADSCRIPT_VERSION = ${JSON.stringify(version)};\n`,
);

for (const path of [
  "README.md",
  "apps/docs/setup/chrome.md",
  "apps/docs/setup/index.md",
  "apps/docs/setup/codex.md",
  "apps/docs/setup/daemon.md",
  "plugins/onshape-cadscript/skills/onshape-cadscript/SKILL.md",
]) {
  const absolute = resolve(root, path);
  const content = await readFile(absolute, "utf8");
  await writeFormatted(
    path,
    content.replace(/onshape-cadscript@\d+\.\d+\.\d+/g, `onshape-cadscript@${version}`),
  );
}

process.stdout.write(`Synchronized release surfaces to ${version}.\n`);
