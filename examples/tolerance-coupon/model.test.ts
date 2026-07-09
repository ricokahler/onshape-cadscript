import { describe, expect, it } from "vitest";
import { materializeModel } from "onshape-cadscript";
import model from "./model.js";

describe("tolerance coupon", () => {
  it("has stable IDs and five slots", async () => {
    const result = await materializeModel(model);
    expect(result.features.map((feature) => feature.id)).toEqual([
      "base-profile",
      "base",
      "top-plane",
      "slot-profile",
      "slots",
    ]);
    const slotSketch = result.features.find((feature) => feature.id === "slot-profile");
    expect(
      slotSketch?.kind === "sketch" &&
        slotSketch.entities.filter((entity) => entity.type === "rectangle"),
    ).toHaveLength(5);
  });
});
