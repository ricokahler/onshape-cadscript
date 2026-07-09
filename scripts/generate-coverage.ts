import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { format, resolveConfig } from "prettier";
import {
  coverageCatalog,
  type CoverageArea,
  type CoverageEntry,
  type CoverageStatus,
} from "../coverage/catalog.js";

const root = resolve(import.meta.dirname, "..");
const statuses: CoverageStatus[] = [
  "stable",
  "experimental",
  "raw escape hatch",
  "planned",
  "not planned",
];
const areas: CoverageArea[] = ["sketch", "feature", "query", "rest", "mcp", "live"];

function table(entries: readonly CoverageEntry[]): string {
  return [
    "| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...entries.map(
      (entry) =>
        `| ${entry.capability} | ${entry.onshapeSurface} | \`${entry.cadscriptApi}\` | ${entry.status} | ${entry.tests} | ${entry.documentation} | ${entry.release} | ${entry.milestone} |`,
    ),
  ].join("\n");
}

const counts = Object.fromEntries(
  statuses.map((status) => [
    status,
    coverageCatalog.filter((entry) => entry.status === status).length,
  ]),
);
const coverage = [
  "# CadScript Coverage",
  "",
  "Generated from `coverage/catalog.ts`. Endpoint availability alone does not count as support; every entry records implementation maturity, tests, documentation, and release intent.",
  "",
  `**${counts.stable} stable** | **${counts.experimental} experimental** | **${counts["raw escape hatch"]} raw escape hatches** | **${counts.planned} planned**`,
  "",
  ...areas.flatMap((area) => [
    `## ${area.toUpperCase()}`,
    "",
    table(coverageCatalog.filter((entry) => entry.area === area)),
    "",
  ]),
].join("\n");

const roadmap = `# Roadmap

Generated from \`coverage/catalog.ts\`.

## v0.1 - Script To Print

Parity with the proven generator DSL, secure local browser bridge, CLI and MCP, validated parameters, shared SVG preview/import, STL export, Codex plugin, public packages, documentation, and release smokes.

${table(coverageCatalog.filter((entry) => entry.milestone === "v0.1" && ["planned", "experimental"].includes(entry.status)))}

## v0.2 - Richer Parts

Loft, sweep, advanced dimensional constraints, improved body naming, richer measurements, and reusable print-fit helpers.

${table(coverageCatalog.filter((entry) => entry.milestone === "v0.2"))}

## v0.3 - Documents And Assemblies

Configurations, Variable Studios, assemblies, mates, and controlled multi-tab document workflows.

${table(coverageCatalog.filter((entry) => entry.milestone === "v0.3"))}

## v1.0 - Stable Model Format

Stable SDK and model format, migration tooling, broader desktop/browser support, mature recovery, and documented compatibility guarantees.

${table(coverageCatalog.filter((entry) => entry.milestone === "v1.0"))}
`;

async function output(path: string, content: string) {
  const absolute = resolve(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  const prettierConfig = (await resolveConfig(absolute)) ?? {};
  await writeFile(
    absolute,
    await format(`${content.trim()}\n`, { ...prettierConfig, filepath: absolute }),
  );
}

await output("COVERAGE.md", coverage);
await output("ROADMAP.md", roadmap);
await output(
  "coverage.json",
  JSON.stringify({ schemaVersion: 1, counts, capabilities: coverageCatalog }, null, 2),
);
await output("apps/docs/reference/coverage.md", coverage);
await output("apps/docs/roadmap.md", roadmap);

const readmePath = resolve(root, "README.md");
try {
  const readme = await readFile(readmePath, "utf8");
  const summary = `<!-- coverage:start -->\n[![Stable coverage](https://img.shields.io/badge/stable-${counts.stable}-19A974)](./COVERAGE.md) [![Experimental coverage](https://img.shields.io/badge/experimental-${counts.experimental}-D97706)](./COVERAGE.md) [![Roadmap](https://img.shields.io/badge/planned-${counts.planned}-627D98)](./ROADMAP.md)\n<!-- coverage:end -->`;
  const nextReadme = readme.replace(
    /<!-- coverage:start -->[\s\S]*?<!-- coverage:end -->/,
    summary,
  );
  const prettierConfig = (await resolveConfig(readmePath)) ?? {};
  await writeFile(
    readmePath,
    await format(nextReadme, { ...prettierConfig, filepath: readmePath }),
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
