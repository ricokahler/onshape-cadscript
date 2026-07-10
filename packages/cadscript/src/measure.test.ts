import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATERIAL_DENSITY_G_PER_CM3,
  DEFAULT_MATERIAL_LABEL,
  MEASURE_FEATURESCRIPT,
  measuredResult,
} from "./measure.js";

describe("measurement query", () => {
  it("uses an explicit PLA density for mass properties", () => {
    expect(MEASURE_FEATURESCRIPT).toContain('"density": 1.24 * gram / centimeter^3');
    expect(measuredResult({ ok: true })).toEqual({
      material: DEFAULT_MATERIAL_LABEL,
      densityGPerCm3: DEFAULT_MATERIAL_DENSITY_G_PER_CM3,
      result: { ok: true },
    });
  });
});
