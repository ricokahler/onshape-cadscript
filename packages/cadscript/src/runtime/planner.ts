import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { compileFeature, parseFeatureLabel } from "../core/compiler.js";
import { contentHash } from "../core/hash.js";
import type { FeatureNode, MaterializedModel } from "../core/types.js";
import {
  assertHealthyFeature,
  type OnshapeClient,
  type PartStudioObservation,
} from "../onshape/client.js";
import type { FeatureStateRecord, OnshapeTarget, ProjectState } from "./project.js";
import { writeProjectState } from "./project.js";

export type PlanOperation =
  | { readonly action: "add"; readonly feature: FeatureNode }
  | { readonly action: "update"; readonly featureId: string; readonly feature: FeatureNode }
  | { readonly action: "delete"; readonly featureId: string; readonly symbolicId: string };

export interface ModelPlan {
  readonly formatVersion: 1;
  readonly planId: string;
  readonly modelName: string;
  readonly target: OnshapeTarget;
  readonly baseMicroversionId: string;
  readonly modelHash: string;
  readonly operations: readonly PlanOperation[];
  readonly desiredFeatures: readonly { symbolicId: string; hash: string }[];
}

export interface PlanOptions {
  readonly adopt?: boolean;
}

function sameTarget(a: OnshapeTarget, b: OnshapeTarget): boolean {
  return (
    a.documentId === b.documentId && a.workspaceId === b.workspaceId && a.elementId === b.elementId
  );
}

function ownedFeatures(observation: PartStudioObservation, modelName: string) {
  return observation.features.filter(
    (feature) => parseFeatureLabel(feature.name)?.modelName === modelName,
  );
}

function verifyOwnership(
  observation: PartStudioObservation,
  state: ProjectState,
  model: MaterializedModel,
): void {
  const byId = new Map(observation.features.map((feature) => [feature.featureId, feature]));
  const stateIds = new Set(state.features.map((feature) => feature.featureId));
  const unexpected = observation.features.filter((feature) => !stateIds.has(feature.featureId));
  if (unexpected.length) {
    throw new Error(
      `Target Part Studio contains ${unexpected.length} feature${unexpected.length === 1 ? "" : "s"} outside CadScript ownership: ${unexpected.map((feature) => feature.name || feature.featureId).join(", ")}`,
    );
  }
  for (const record of state.features) {
    const remote = byId.get(record.featureId);
    if (!remote)
      throw new Error(
        `Remote feature ${record.symbolicId} (${record.featureId}) is missing. Re-plan with --adopt only after inspecting the Part Studio.`,
      );
    const label = parseFeatureLabel(remote.name);
    if (label?.modelName !== model.name || label.symbolicId !== record.symbolicId) {
      throw new Error(
        `Remote feature ${record.featureId} is no longer owned by ${model.name}/${record.symbolicId}`,
      );
    }
  }
}

export function createPlan(
  model: MaterializedModel,
  target: OnshapeTarget,
  observation: PartStudioObservation,
  state?: ProjectState,
  options: PlanOptions = {},
): ModelPlan {
  const desired = model.features.map((feature) => ({
    symbolicId: feature.id,
    hash: contentHash(feature),
    feature,
  }));
  let current: readonly FeatureStateRecord[] = state?.features ?? [];

  if (state) {
    if (!sameTarget(state.target, target))
      throw new Error("Project state belongs to a different Onshape Part Studio");
    if (state.modelName !== model.name)
      throw new Error(`Project state belongs to model ${state.modelName}, not ${model.name}`);
    verifyOwnership(observation, state, model);
  } else if (observation.features.length > 0) {
    const owned = ownedFeatures(observation, model.name);
    if (!options.adopt) {
      throw new Error(
        owned.length === observation.features.length
          ? "This CadScript Part Studio has no local state. Inspect it, then run plan with --adopt to take ownership."
          : "Target Part Studio is not empty and contains features CadScript does not own. Use a dedicated empty Part Studio.",
      );
    }
    if (owned.length !== observation.features.length)
      throw new Error("Cannot adopt a Part Studio containing non-CadScript features");
    current = owned.map((feature) => {
      const label = parseFeatureLabel(feature.name);
      return {
        symbolicId: label?.symbolicId ?? feature.featureId,
        featureId: feature.featureId,
        hash: "adopted-unknown",
      };
    });
  }

  const currentIds = current.map((record) => record.symbolicId);
  const desiredIds = desired.map((record) => record.symbolicId);
  const sameStructure =
    currentIds.length === desiredIds.length &&
    currentIds.every((id, index) => id === desiredIds[index]);
  const operations: PlanOperation[] = [];

  if (sameStructure) {
    for (let index = 0; index < desired.length; index += 1) {
      const currentFeature = current[index]!;
      const desiredFeature = desired[index]!;
      if (currentFeature.hash !== desiredFeature.hash) {
        operations.push({
          action: "update",
          featureId: currentFeature.featureId,
          feature: desiredFeature.feature,
        });
      }
    }
  } else {
    let prefixLength = 0;
    while (
      prefixLength < current.length &&
      prefixLength < desired.length &&
      current[prefixLength]!.symbolicId === desired[prefixLength]!.symbolicId
    ) {
      const currentFeature = current[prefixLength]!;
      const desiredFeature = desired[prefixLength]!;
      if (currentFeature.hash !== desiredFeature.hash) {
        operations.push({
          action: "update",
          featureId: currentFeature.featureId,
          feature: desiredFeature.feature,
        });
      }
      prefixLength += 1;
    }
    for (const record of [...current.slice(prefixLength)].reverse()) {
      operations.push({
        action: "delete",
        featureId: record.featureId,
        symbolicId: record.symbolicId,
      });
    }
    for (const record of desired.slice(prefixLength))
      operations.push({ action: "add", feature: record.feature });
  }

  const planBody = {
    formatVersion: 1 as const,
    modelName: model.name,
    target,
    baseMicroversionId: observation.microversionId,
    modelHash: contentHash(model),
    operations,
    desiredFeatures: desired.map(({ symbolicId, hash }) => ({ symbolicId, hash })),
  };
  return { ...planBody, planId: contentHash(planBody) };
}

export function planSummary(plan: ModelPlan): string {
  const counts = { add: 0, update: 0, delete: 0 };
  for (const operation of plan.operations) counts[operation.action] += 1;
  return plan.operations.length === 0
    ? `Plan ${plan.planId}: no changes`
    : `Plan ${plan.planId}: ${counts.add} add, ${counts.update} update, ${counts.delete} delete`;
}

export function planPath(root: string, planId: string): string {
  return join(root, ".cadscript", "plans", `${planId}.json`);
}

export async function writePlan(root: string, plan: ModelPlan): Promise<string> {
  const path = planPath(root, plan.planId);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`, { mode: 0o600 });
  return path;
}

export async function readPlan(root: string, planId: string): Promise<ModelPlan> {
  const plan = JSON.parse(await readFile(planPath(root, planId), "utf8")) as ModelPlan;
  const { planId: ignored, ...body } = plan;
  void ignored;
  if (contentHash(body) !== planId)
    throw new Error(`Plan ${planId} is corrupt or was edited after creation`);
  return plan;
}

export async function applyPlan(
  client: OnshapeClient,
  root: string,
  model: MaterializedModel,
  plan: ModelPlan,
): Promise<{
  state: ProjectState;
  observation: PartStudioObservation;
  verificationPlan: ModelPlan;
}> {
  if (plan.modelName !== model.name || plan.modelHash !== contentHash(model)) {
    throw new Error("Model changed after this plan was created. Run cadscript plan again.");
  }
  const before = await client.observe(plan.target);
  if (plan.baseMicroversionId !== "unknown" && before.microversionId !== plan.baseMicroversionId) {
    throw new Error(
      `Stale plan: expected microversion ${plan.baseMicroversionId}, found ${before.microversionId}`,
    );
  }

  const featureIds = new Map<string, string>();
  for (const feature of before.features) {
    const label = parseFeatureLabel(feature.name);
    if (label?.modelName === model.name) featureIds.set(label.symbolicId, feature.featureId);
  }
  const resolve = (symbolicId: string): string => {
    const id = featureIds.get(symbolicId);
    if (!id) throw new Error(`Feature ${symbolicId} is referenced before it exists`);
    return id;
  };

  if (plan.operations.some((operation) => operation.action === "delete")) {
    await client.createCheckpoint(plan.target, `Before CadScript ${new Date().toISOString()}`);
  }

  for (const operation of plan.operations) {
    if (operation.action === "delete") {
      await client.deleteFeature(plan.target, operation.featureId);
      featureIds.delete(operation.symbolicId);
      continue;
    }
    const definition = compileFeature(model, operation.feature, resolve);
    if (operation.action === "update") {
      const result = await client.updateFeature(plan.target, operation.featureId, definition);
      assertHealthyFeature(result, operation.feature.id);
      featureIds.set(operation.feature.id, result.featureId || operation.featureId);
    } else {
      const result = await client.addFeature(plan.target, definition);
      assertHealthyFeature(result, operation.feature.id);
      if (!result.featureId)
        throw new Error(`Onshape did not return an ID for feature ${operation.feature.id}`);
      featureIds.set(operation.feature.id, result.featureId);
    }
  }

  const after = await client.observe(plan.target);
  for (const feature of after.features) {
    const label = parseFeatureLabel(feature.name);
    if (label?.modelName !== model.name) {
      throw new Error(
        `Part Studio gained a feature outside ${model.name} ownership during apply: ${feature.name}`,
      );
    }
    assertHealthyFeature(feature, feature.name);
  }
  const state: ProjectState = {
    formatVersion: 1,
    modelName: model.name,
    target: plan.target,
    microversionId: after.microversionId,
    features: plan.desiredFeatures.map((record) => ({
      ...record,
      featureId: resolve(record.symbolicId),
    })),
  };
  await writeProjectState(root, state);
  const verificationPlan = createPlan(model, plan.target, after, state);
  if (verificationPlan.operations.length > 0)
    throw new Error("Apply completed, but the verification plan is not a no-op");
  return { state, observation: after, verificationPlan };
}
