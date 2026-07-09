import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "apps/docs/snippets");
await mkdir(output, { recursive: true });

for (const name of ["tolerance-coupon", "revolved-knob", "svg-keychain"]) {
  const source = await readFile(resolve(root, "examples", name, "model.ts"), "utf8");
  await writeFile(resolve(output, `${name}.md`), `\`\`\`ts\n${source.trim()}\n\`\`\`\n`);
}
