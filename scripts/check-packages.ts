import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const packages = [
  {
    directory: "packages/cadscript",
    required: [
      "dist/index.js",
      "dist/index.d.ts",
      "dist/cli.js",
      "dist/mcp.js",
      "dist/native-host.js",
      "dist/extension/chrome/manifest.json",
      "README.md",
      "LICENSE",
      "package.json",
    ],
  },
  {
    directory: "plugins/onshape-cadscript",
    required: [
      ".codex-plugin/plugin.json",
      ".mcp.json",
      "skills/onshape-cadscript/SKILL.md",
      "assets/icon.png",
      "assets/workflow.png",
      "README.md",
      "LICENSE",
      "package.json",
    ],
  },
] as const;

for (const packageInfo of packages) {
  const cwd = resolve(root, packageInfo.directory);
  const { stdout } = await exec("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  });
  const result = JSON.parse(stdout) as {
    files: { path: string }[];
    name: string;
    version: string;
  }[];
  const packed = new Set(result[0]?.files.map((file) => file.path) ?? []);
  const missing = packageInfo.required.filter((path) => !packed.has(path));
  if (missing.length)
    throw new Error(`${packageInfo.directory} tarball is missing: ${missing.join(", ")}`);
  process.stdout.write(`${result[0]?.name}@${result[0]?.version}: ${packed.size} files verified\n`);
}
