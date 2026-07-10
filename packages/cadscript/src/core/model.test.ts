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

  it("compiles advanced print features with symbolic references", async () => {
    const advanced = defineModel({
      name: "advanced",
      units: "mm",
      parameters: {},
      async *build(cad) {
        const profile = yield* cad.sketch({
          id: "profile",
          plane: cad.top,
          entities: [sketch.rectangle("outline", [0, 0], [10, 10])],
        });
        const target = yield* cad.extrude({ id: "target", profile, depth: length(5) });
        yield* cad.extrude({
          id: "bounded",
          profile,
          operation: "ADD",
          endBound: "UP_TO_BODY",
          endBoundEntity: cad.bodies(target),
          secondDirectionBound: "THROUGH_ALL",
          filterInnerLoops: true,
          scope: cad.bodies(target),
        });
        const angled = yield* cad.plane({
          id: "angled",
          reference: cad.sketchEntity(profile, "outline.bottom"),
          planeType: "LINE_ANGLE",
          angle: 15 as never,
        });
        yield* cad.split({
          id: "split",
          tool: { type: "plane", feature: angled },
          targets: [cad.bodies(target)],
        });
        yield* cad.chamfer({
          id: "chamfer",
          edges: cad.edges(target),
          width: length(1),
          chamferType: "OFFSET_ANGLE",
          angle: 45 as never,
        });
      },
    });

    const result = await materializeModel(advanced);
    const resolve = (id: string) => `remote-${id}`;
    const compiled = result.features.map((feature) => compileFeature(result, feature, resolve));
    const json = JSON.stringify(compiled);
    expect(json).toContain('"value":"UP_TO_BODY"');
    expect(json).toContain('"parameterId":"endBoundEntityBody"');
    expect(json).toContain('"filterInnerLoops":true');
    expect(json).toContain('"featureType":"splitPart"');
    expect(json).toContain('"value":"OFFSET_ANGLE"');
    expect(json).toContain("remote-target");
  });

  it("resolves symbolic IDs inside nested raw parameters", async () => {
    const raw = defineModel({
      name: "raw",
      units: "mm",
      parameters: {},
      async *build(cad) {
        yield* cad.rawFeature({
          id: "raw-feature",
          featureType: "customFeature",
          parameters: [
            {
              btType: "BTMParameterQueryList-148",
              parameterId: "entities",
              queries: [
                {
                  btType: "BTMIndividualQuery-138",
                  queryString: "query=qCreatedBy($feature(source), EntityType.BODY);",
                },
              ],
            },
          ],
        });
      },
    });
    const result = await materializeModel(raw);
    expect(
      JSON.stringify(compileFeature(result, result.features[0]!, (id) => `remote-${id}`)),
    ).toContain('makeId(\\"remote-source\\")');
  });
});
