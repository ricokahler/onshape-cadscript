import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const destination = resolve(root, "packages/cadscript/dist/extension/chrome");
await mkdir(destination, { recursive: true });
await cp(resolve(root, "extension/chrome"), destination, { recursive: true });
