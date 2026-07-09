import { describe, expect, it } from "vitest";
import { importSvg, materializeModel } from "onshape-cadscript";
import model from "./model.js";

describe("SVG keychain", () => {
  it("parses the SVG into sketch geometry", async () => {
    const result = await materializeModel(model);
    const profile = result.features[0];
    expect(profile?.kind).toBe("sketch");
    if (profile?.kind !== "sketch" || profile.entities[0]?.type !== "svg")
      throw new Error("Missing SVG sketch");
    expect(importSvg(profile.entities[0].source).length).toBeGreaterThan(4);
  });
});
