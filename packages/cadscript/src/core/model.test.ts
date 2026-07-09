import { describe, expect, it } from "vitest";
import { compileFeature } from "./compiler.js";
import { defineModel, materializeModel } from "./model.js";
import { length } from "./quantities.js";
import { sketch } from "./sketch.js";

const model = defineModel({
  name: "test-block",
  units: "mm",
  parameters: {},
  async *build(cad) {
    const profile = yield* cad.sketch({
      id: "profile",
      plane: cad.top,
      entities: [sketch.rectangle("outline", [-10, -5], [10, 5])],
    });
    const body = yield* cad.extrude({ id: "body", profile, depth: length(4) });
    yield* cad.fillet({ id: "edges", edges: cad.edges(body), radius: length(0.5) });
  },
});

describe("model runtime", () => {
  it("materializes stable symbolic references", async () => {
    const result = await materializeModel(model);
    expect(result.features.map((feature) => [feature.id, feature.kind])).toEqual([
      ["profile", "sketch"],
      ["body", "extrude"],
      ["edges", "fillet"],
    ]);
  });

  it("compiles references only through the resolver", async () => {
    const result = await materializeModel(model);
    const extrude = result.features[1]!;
    const compiled = compileFeature(result, extrude, (id) => `remote-${id}`);
    expect(JSON.stringify(compiled)).toContain("remote-profile");
    expect(JSON.stringify(compiled)).not.toContain('"featureId":"profile"');
  });

  it("rejects duplicate feature IDs", async () => {
    const invalid = defineModel({
      name: "invalid",
      units: "mm",
      parameters: {},
      async *build(cad) {
        yield* cad.sketch({ id: "same", plane: cad.top, entities: [] });
        yield* cad.sketch({ id: "same", plane: cad.top, entities: [] });
      },
    });
    await expect(materializeModel(invalid)).rejects.toThrow("Duplicate feature id");
  });
});
