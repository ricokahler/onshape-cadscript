import type {
  Cad,
  FeatureGenerator,
  FeatureKind,
  FeatureNode,
  FeatureRef,
  MaterializedModel,
  ModelDefinition,
  ParameterSpecs,
  ParameterValues,
  QueryRef,
} from "./types.js";

function operation<K extends FeatureKind>(node: FeatureNode & { kind: K }): FeatureGenerator<K> {
  return (async function* () {
    yield node;
    return { type: "feature", id: node.id, kind: node.kind } as FeatureRef<K>;
  })();
}

export function createCad(): Cad {
  const createdBy = (
    feature: FeatureRef,
    entityType: "BODY" | "FACE" | "EDGE" | "VERTEX",
  ): QueryRef => ({
    type: "created-by",
    feature,
    entityType,
  });

  return {
    top: { type: "plane", name: "Top" },
    front: { type: "plane", name: "Front" },
    right: { type: "plane", name: "Right" },
    sketch: (options) =>
      operation({ kind: "sketch", ...options, constraints: options.constraints ?? [] }),
    extrude: (options) =>
      operation({
        kind: "extrude",
        operation: "NEW",
        bodyType: "SOLID",
        endBound: "BLIND",
        ...options,
      }),
    revolve: (options) =>
      operation({ kind: "revolve", operation: "NEW", revolveType: "FULL", ...options }),
    fillet: (options) => operation({ kind: "fillet", ...options }),
    chamfer: (options) => operation({ kind: "chamfer", ...options }),
    boolean: (options) => operation({ kind: "boolean", ...options }),
    plane: (options) => operation({ kind: "plane", ...options }),
    split: (options) => operation({ kind: "split", ...options }),
    transform: (options) => operation({ kind: "transform", ...options }),
    shell: (options) => operation({ kind: "shell", ...options }),
    rawFeature: (options) => operation({ kind: "raw", ...options }),
    bodies: (feature) => createdBy(feature, "BODY"),
    faces: (feature) => createdBy(feature, "FACE"),
    edges: (feature) => createdBy(feature, "EDGE"),
    vertices: (feature) => createdBy(feature, "VERTEX"),
    sketchEntity: (sketch, entityId, entityType = "EDGE") => ({
      type: "sketch-entity",
      sketch,
      entityId,
      entityType,
    }),
    cap: (feature, cap, entityType = "FACE") => ({ type: "cap", feature, cap, entityType }),
    ownedByBody: (body, entityType) => ({ type: "owned-by-body", body, entityType }),
    geometry: (query, geometry) => ({ type: "geometry", query, geometry }),
    closestTo: (query, point) => ({ type: "closest-to", query, point }),
    rawQuery: (query) => ({ type: "raw", query }),
  };
}

export function defineModel<const P extends ParameterSpecs>(
  definition: ModelDefinition<P>,
): ModelDefinition<P> {
  if (!definition.name.trim()) throw new TypeError("Model name is required");
  return definition;
}

function resolveParameters<P extends ParameterSpecs>(
  specs: P,
  overrides: Partial<ParameterValues<P>>,
): ParameterValues<P> {
  const result: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(specs)) {
    const value = name in overrides ? overrides[name as keyof typeof overrides] : spec.default;
    if (spec.kind === "number" || spec.kind === "length") {
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new TypeError(`Parameter ${name} must be a finite number`);
      if (typeof spec.min === "number" && value < spec.min)
        throw new RangeError(`Parameter ${name} is below its minimum`);
      if (typeof spec.max === "number" && value > spec.max)
        throw new RangeError(`Parameter ${name} is above its maximum`);
    }
    if (spec.choices && !spec.choices.includes(value))
      throw new RangeError(`Parameter ${name} must be one of ${spec.choices.join(", ")}`);
    result[name] = value;
  }
  const unknown = Object.keys(overrides).filter((key) => !(key in specs));
  if (unknown.length)
    throw new TypeError(`Unknown parameter${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`);
  return result as ParameterValues<P>;
}

export async function materializeModel<P extends ParameterSpecs>(
  definition: ModelDefinition<P>,
  overrides: Partial<ParameterValues<P>> = {},
): Promise<MaterializedModel> {
  const parameters = resolveParameters(definition.parameters, overrides);
  const features: FeatureNode[] = [];
  const featureIds = new Set<string>();
  const entityIds = new Set<string>();

  for await (const feature of definition.build(createCad(), parameters)) {
    if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(feature.id)) {
      throw new TypeError(
        `Invalid feature id "${feature.id}"; use letters, numbers, dots, dashes, and underscores`,
      );
    }
    if (featureIds.has(feature.id)) throw new TypeError(`Duplicate feature id: ${feature.id}`);
    featureIds.add(feature.id);
    if (feature.kind === "sketch") {
      for (const entity of feature.entities) {
        const scopedId = `${feature.id}/${entity.id}`;
        if (entityIds.has(scopedId)) throw new TypeError(`Duplicate sketch entity id: ${scopedId}`);
        entityIds.add(scopedId);
      }
    }
    features.push(feature);
  }

  return { name: definition.name, units: definition.units, parameters, features };
}
