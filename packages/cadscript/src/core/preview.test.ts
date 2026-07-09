import { describe, expect, it } from "vitest";
import { defineModel, materializeModel } from "./model.js";
import { renderSketchPng, renderSketchSvg } from "./preview.js";
import { length } from "./quantities.js";
import { sketch } from "./sketch.js";

describe("sketch preview", () => {
  it("renders SVG and a non-empty PNG from the same AST", async () => {
    const model = await materializeModel(
      defineModel({
        name: "preview",
        units: "mm",
        parameters: {},
        async *build(cad) {
          yield* cad.sketch({
            id: "profile",
            plane: cad.top,
            entities: [
              sketch.roundedRectangle("outline", [-20, -10], [20, 10], length(3)),
              sketch.circle("hole", [14, 0], length(2)),
            ],
          });
        },
      }),
    );
    expect(renderSketchSvg(model)).toContain('rx="3"');
    const png = renderSketchPng(model);
    expect(Buffer.from(png).subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.length).toBeGreaterThan(1000);
  });
});
