import { describe, expect, it } from "vitest";
import { materializeModel } from "onshape-cadscript";
import model from "./model.js";

describe("revolved knob", () => {
  it("builds a sketch, revolve, and fillet", async () => {
    const result = await materializeModel(model);
    expect(result.features.map((feature) => feature.kind)).toEqual(["sketch", "revolve", "fillet"]);
  });
});
