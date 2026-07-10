export const DEFAULT_MATERIAL_DENSITY_G_PER_CM3 = 1.24;
export const DEFAULT_MATERIAL_LABEL = "PLA";

export const MEASURE_FEATURESCRIPT = `function(context is Context, queries is map) {
  return {
    "bounds": evBox3d(context, {
      "topology": qEverything(EntityType.BODY),
      "tight": true
    }),
    "mass": evApproximateMassProperties(context, {
      "entities": qEverything(EntityType.BODY),
      "density": ${DEFAULT_MATERIAL_DENSITY_G_PER_CM3} * gram / centimeter^3
    })
  };
}`;

export function measuredResult(result: unknown) {
  return {
    material: DEFAULT_MATERIAL_LABEL,
    densityGPerCm3: DEFAULT_MATERIAL_DENSITY_G_PER_CM3,
    result,
  };
}
