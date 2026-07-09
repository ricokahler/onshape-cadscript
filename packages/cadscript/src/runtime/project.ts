import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createJiti } from "jiti";
import { z } from "zod";
import type { ModelDefinition, ParameterSpecs } from "../core/types.js";
import { CADSCRIPT_VERSION } from "../version.js";

export interface OnshapeTarget {
  readonly documentId: string;
  readonly workspaceId: string;
  readonly elementId: string;
}

export interface CadScriptConfig {
  readonly model: string;
  readonly target?: OnshapeTarget | undefined;
  readonly parameters: Record<string, unknown>;
}

const targetSchema = z.object({
  documentId: z.string().min(1),
  workspaceId: z.string().min(1),
  elementId: z.string().min(1),
});

const configSchema = z.object({
  model: z.string().default("./model.ts"),
  target: targetSchema.optional(),
  parameters: z.record(z.unknown()).default({}),
});

export interface LoadedProject {
  readonly root: string;
  readonly configPath: string;
  readonly config: CadScriptConfig;
  readonly model: ModelDefinition<ParameterSpecs>;
}

export interface FeatureStateRecord {
  readonly symbolicId: string;
  readonly featureId: string;
  readonly hash: string;
}

export interface ProjectState {
  readonly formatVersion: 1;
  readonly modelName: string;
  readonly target: OnshapeTarget;
  readonly microversionId: string;
  readonly features: readonly FeatureStateRecord[];
}

export function defineProject(config: CadScriptConfig): CadScriptConfig {
  return configSchema.parse(config);
}

export async function findProjectRoot(start = process.cwd()): Promise<string> {
  let current = resolve(start);
  while (true) {
    try {
      await readFile(join(current, "cadscript.config.ts"));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) throw new Error(`No cadscript.config.ts found from ${start}`);
      current = parent;
    }
  }
}

export async function loadProject(start = process.cwd()): Promise<LoadedProject> {
  const root = await findProjectRoot(start);
  const configPath = join(root, "cadscript.config.ts");
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const configModule = await jiti.import(configPath);
  const config = configSchema.parse(
    (configModule as { default?: unknown }).default ?? configModule,
  );
  const modelPath = resolve(root, config.model);
  const modelModule = await jiti.import(modelPath);
  const model = ((modelModule as { default?: unknown }).default ??
    modelModule) as ModelDefinition<ParameterSpecs>;
  if (!model || typeof model.build !== "function")
    throw new Error(`${modelPath} does not export a CadScript model as default`);
  return { root, configPath, config, model };
}

export function statePath(root: string): string {
  return join(root, ".cadscript", "state.json");
}

export async function readProjectState(root: string): Promise<ProjectState | undefined> {
  try {
    return JSON.parse(await readFile(statePath(root), "utf8")) as ProjectState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeProjectState(root: string, state: ProjectState): Promise<void> {
  const path = statePath(root);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

export async function writeStarterProject(root: string, name: string): Promise<void> {
  await mkdir(root, { recursive: true });
  const packageJson = {
    name,
    private: true,
    type: "module",
    scripts: { plan: "cadscript plan", apply: "cadscript apply", preview: "cadscript preview" },
    dependencies: { "onshape-cadscript": `^${CADSCRIPT_VERSION}` },
  };
  await writeFile(join(root, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  await writeFile(
    join(root, "cadscript.config.ts"),
    `import { defineProject } from "onshape-cadscript";\n\nexport default defineProject({\n  model: "./model.ts",\n  parameters: {},\n});\n`,
  );
  await writeFile(
    join(root, "model.ts"),
    `import { defineModel, length, lengthParam, sketch } from "onshape-cadscript";\n\nexport default defineModel({\n  name: ${JSON.stringify(name)},\n  units: "mm",\n  parameters: { width: lengthParam(40), height: lengthParam(24), depth: lengthParam(8) },\n  async *build(cad, p) {\n    const profile = yield* cad.sketch({\n      id: "profile",\n      plane: cad.top,\n      entities: [sketch.roundedRectangle("outline", [-p.width / 2, -p.height / 2], [p.width / 2, p.height / 2], length(3))],\n      constraints: [],\n    });\n    yield* cad.extrude({ id: "body", profile, depth: p.depth });\n  },\n});\n`,
  );
  await writeFile(join(root, ".gitignore"), ".cadscript/\nnode_modules/\n*.stl\n");
}
