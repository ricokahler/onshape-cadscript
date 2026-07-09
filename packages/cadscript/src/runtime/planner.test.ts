import { describe, expect, it } from "vitest";
import { featureLabel } from "../core/compiler.js";
import { contentHash } from "../core/hash.js";
import { defineModel, materializeModel } from "../core/model.js";
import { length } from "../core/quantities.js";
import { sketch } from "../core/sketch.js";
import type { PartStudioObservation } from "../onshape/client.js";
import type { ProjectState } from "./project.js";
import { createPlan } from "./planner.js";

const target = { documentId: "d", workspaceId: "w", elementId: "e" };

async function block(depth = 4, includeFillet = false) {
  return materializeModel(
    defineModel({
      name: "block",
      units: "mm",
      parameters: {},
      async *build(cad) {
        const profile = yield* cad.sketch({
          id: "profile",
          plane: cad.top,
          entities: [sketch.rectangle("outline", [0, 0], [10, 10])],
        });
        const body = yield* cad.extrude({ id: "body", profile, depth: length(depth) });
        if (includeFillet)
          yield* cad.fillet({ id: "fillet", edges: cad.edges(body), radius: length(1) });
      },
    }),
  );
}

function fixtures(model: Awaited<ReturnType<typeof block>>): {
  observation: PartStudioObservation;
  state: ProjectState;
} {
  const features = model.features.map((feature, index) => ({
    featureId: `remote-${index}`,
    name: featureLabel(model.name, feature),
    featureType: feature.kind,
    status: "ok",
    notices: [],
    definition: {},
  }));
  return {
    observation: { microversionId: "m1", features },
    state: {
      formatVersion: 1,
      modelName: model.name,
      target,
      microversionId: "m1",
      features: model.features.map((feature, index) => ({
        symbolicId: feature.id,
        featureId: `remote-${index}`,
        hash: contentHash(feature),
      })),
    },
  };
}

describe("planner", () => {
  it("returns no changes for matching state", async () => {
    const model = await block();
    const { observation, state } = fixtures(model);
    expect(createPlan(model, target, observation, state).operations).toEqual([]);
  });

  it("updates in place when only feature content changes", async () => {
    const previous = await block();
    const desired = await block(6);
    const { observation, state } = fixtures(previous);
    expect(
      createPlan(desired, target, observation, state).operations.map(
        (operation) => operation.action,
      ),
    ).toEqual(["update"]);
  });

  it("adds only the new suffix after a structural change", async () => {
    const previous = await block();
    const desired = await block(4, true);
    const { observation, state } = fixtures(previous);
    expect(
      createPlan(desired, target, observation, state).operations.map(
        (operation) => operation.action,
      ),
    ).toEqual(["add"]);
  });
});
