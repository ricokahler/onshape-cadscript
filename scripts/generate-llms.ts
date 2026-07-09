import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const docs = resolve(root, "apps/docs");
const files: string[] = [];

async function walk(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "public" || entry.name === "snippets")
      continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith(".md")) files.push(path);
  }
}

await walk(docs);
files.sort();
const sections = await Promise.all(
  files.map(
    async (path) =>
      `\n\n---\nSource: ${relative(docs, path)}\n---\n\n${await readFile(path, "utf8")}`,
  ),
);
await writeFile(
  resolve(root, "llms-full.txt"),
  `# Onshape CadScript full documentation\n${sections.join("")}\n`,
);
