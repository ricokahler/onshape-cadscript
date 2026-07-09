import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(import.meta.dirname, "..");
const assetDirectory = resolve(root, "plugins/onshape-cadscript/assets");

for (const [source, target, width] of [
  ["icon.svg", "icon.png", 512],
  ["logo.svg", "logo.png", 1200],
  ["logo-dark.svg", "logo-dark.png", 1200],
  ["workflow.svg", "workflow.png", 1600],
  ["model.svg", "model.png", 1600],
] as const) {
  const svg = await readFile(resolve(assetDirectory, source), "utf8");
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
  await writeFile(resolve(assetDirectory, target), png);
}

await mkdir(resolve(root, "assets"), { recursive: true });
const demoSource = await readFile(resolve(assetDirectory, "workflow.svg"), "utf8");
const demoPng = new Resvg(demoSource, { fitTo: { mode: "width", value: 960 } }).render().asPng();
await writeFile(resolve(root, "assets/demo.png"), demoPng);

const extensionIcons = resolve(root, "extension/chrome/icons");
await mkdir(extensionIcons, { recursive: true });
const iconSource = await readFile(resolve(assetDirectory, "icon.svg"), "utf8");
for (const size of [16, 32, 48, 128]) {
  const icon = new Resvg(iconSource, { fitTo: { mode: "width", value: size } }).render().asPng();
  await writeFile(resolve(extensionIcons, `icon-${size}.png`), icon);
}
