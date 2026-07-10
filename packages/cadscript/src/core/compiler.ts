import { angleExpression, lengthExpression, lengthToMeters } from "./quantities.js";
import { expandSketchEntities } from "./svg.js";
import type {
  FeatureNode,
  MaterializedModel,
  ModelUnits,
  PlaneRef,
  QueryRef,
  SketchConstraint,
  SketchEntity,
} from "./types.js";

export type FeatureIdResolver = (symbolicId: string) => string;

interface SketchDefinition {
  entity: Record<string, unknown>;
  constraints: Record<string, unknown>[];
}

function queryString(query: QueryRef, resolve: FeatureIdResolver): string {
  switch (query.type) {
    case "created-by":
      return `qCreatedBy(makeId("${resolve(query.feature.id)}"), EntityType.${query.entityType})`;
    case "sketch-entity":
      return `sketchEntityQuery(makeId("${resolve(query.sketch.id)}"), EntityType.${query.entityType}, "${query.entityId}")`;
    case "cap":
      return `qCapEntity(makeId("${resolve(query.feature.id)}"), CapType.${query.cap}, EntityType.${query.entityType})`;
    case "owned-by-body":
      return `qOwnedByBody(${queryString(query.body, resolve)}, EntityType.${query.entityType})`;
    case "geometry":
      return `qGeometry(${queryString(query.query, resolve)}, GeometryType.${query.geometry})`;
    case "closest-to":
      return `qClosestTo(${queryString(query.query, resolve)}, vector(${query.point.join(", ")}) * meter)`;
    case "raw":
      return query.query
        .replace(/\$feature\(([^)]+)\)/g, (_match, id: string) => `makeId("${resolve(id)}")`)
        .replace(/^query=/, "")
        .replace(/;$/, "");
  }
}

function individualQuery(query: QueryRef, resolve: FeatureIdResolver): Record<string, unknown> {
  if (query.type === "created-by") {
    return {
      btType: "BTMIndividualCreatedByQuery-137",
      featureId: resolve(query.feature.id),
      entityType: query.entityType,
    };
  }
  return { btType: "BTMIndividualQuery-138", queryString: `query=${queryString(query, resolve)};` };
}

function planeQuery(plane: PlaneRef, resolve: FeatureIdResolver): Record<string, unknown> {
  if (plane.name) {
    return {
      btType: "BTMIndividualQuery-138",
      queryString: `query=qCreatedBy(makeId("${plane.name}"), EntityType.FACE);`,
    };
  }
  if (plane.feature) {
    return {
      btType: "BTMIndividualCreatedByQuery-137",
      featureId: resolve(plane.feature.id),
      entityType: "FACE",
    };
  }
  throw new Error("Plane reference is empty");
}

function fixed(id: string): Record<string, unknown> {
  return {
    btType: "BTMSketchConstraint-2",
    constraintType: "FIX",
    entityId: `fix.${id}`,
    parameters: [{ btType: "BTMParameterString-149", parameterId: "localFirst", value: id }],
  };
}

function coincident(id: string, first: string, second: string): Record<string, unknown> {
  return {
    btType: "BTMSketchConstraint-2",
    constraintType: "COINCIDENT",
    entityId: id,
    parameters: [
      { btType: "BTMParameterString-149", parameterId: "localFirst", value: first },
      { btType: "BTMParameterString-149", parameterId: "localSecond", value: second },
    ],
  };
}

function lineDefinition(
  id: string,
  from: readonly [number, number],
  to: readonly [number, number],
  units: ModelUnits,
  construction = false,
): SketchDefinition {
  const x1 = lengthToMeters(from[0] as never, units);
  const y1 = lengthToMeters(from[1] as never, units);
  const x2 = lengthToMeters(to[0] as never, units);
  const y2 = lengthToMeters(to[1] as never, units);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segmentLength = Math.hypot(dx, dy);
  if (segmentLength === 0) throw new Error(`Sketch line ${id} has zero length`);
  return {
    entity: {
      btType: "BTMSketchCurveSegment-155",
      entityId: id,
      startPointId: `${id}.start`,
      endPointId: `${id}.end`,
      startParam: -segmentLength / 2,
      endParam: segmentLength / 2,
      isConstruction: construction,
      geometry: {
        btType: "BTCurveGeometryLine-117",
        pntX: (x1 + x2) / 2,
        pntY: (y1 + y2) / 2,
        dirX: dx / segmentLength,
        dirY: dy / segmentLength,
      },
    },
    constraints: [fixed(id)],
  };
}

function roundedRectangleLines(
  entity: Extract<SketchEntity, { type: "roundedRectangle" }>,
): SketchEntity[] {
  const [x1, y1] = entity.corner1;
  const [x2, y2] = entity.corner2;
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const bottom = Math.min(y1, y2);
  const top = Math.max(y1, y2);
  const radius = Math.min(
    entity.radius,
    (right - left) / 2,
    (top - bottom) / 2,
  ) as typeof entity.radius;
  return [
    {
      type: "line",
      id: `${entity.id}.bottom`,
      from: [left + radius, bottom],
      to: [right - radius, bottom],
    },
    {
      type: "arc",
      id: `${entity.id}.bottomRight`,
      center: [right - radius, bottom + radius],
      radius,
      startAngle: -90 as never,
      endAngle: 0 as never,
    },
    {
      type: "line",
      id: `${entity.id}.right`,
      from: [right, bottom + radius],
      to: [right, top - radius],
    },
    {
      type: "arc",
      id: `${entity.id}.topRight`,
      center: [right - radius, top - radius],
      radius,
      startAngle: 0 as never,
      endAngle: 90 as never,
    },
    { type: "line", id: `${entity.id}.top`, from: [right - radius, top], to: [left + radius, top] },
    {
      type: "arc",
      id: `${entity.id}.topLeft`,
      center: [left + radius, top - radius],
      radius,
      startAngle: 90 as never,
      endAngle: 180 as never,
    },
    {
      type: "line",
      id: `${entity.id}.left`,
      from: [left, top - radius],
      to: [left, bottom + radius],
    },
    {
      type: "arc",
      id: `${entity.id}.bottomLeft`,
      center: [left + radius, bottom + radius],
      radius,
      startAngle: 180 as never,
      endAngle: 270 as never,
    },
  ];
}

function compileSketchEntity(entity: SketchEntity, units: ModelUnits): SketchDefinition[] {
  if (entity.type === "rectangle") {
    const [x1, y1] = entity.corner1;
    const [x2, y2] = entity.corner2;
    const definitions = [
      lineDefinition(`${entity.id}.bottom`, [x1, y1], [x2, y1], units, entity.construction),
      lineDefinition(`${entity.id}.right`, [x2, y1], [x2, y2], units, entity.construction),
      lineDefinition(`${entity.id}.top`, [x2, y2], [x1, y2], units, entity.construction),
      lineDefinition(`${entity.id}.left`, [x1, y2], [x1, y1], units, entity.construction),
    ];
    definitions[0]!.constraints.push(
      coincident(`${entity.id}.corner0`, `${entity.id}.bottom.end`, `${entity.id}.right.start`),
      coincident(`${entity.id}.corner1`, `${entity.id}.right.end`, `${entity.id}.top.start`),
      coincident(`${entity.id}.corner2`, `${entity.id}.top.end`, `${entity.id}.left.start`),
      coincident(`${entity.id}.corner3`, `${entity.id}.left.end`, `${entity.id}.bottom.start`),
    );
    return definitions;
  }
  if (entity.type === "roundedRectangle") {
    const definitions = roundedRectangleLines(entity).flatMap((child) =>
      compileSketchEntity(child, units),
    );
    const ids = [
      "bottom",
      "bottomRight",
      "right",
      "topRight",
      "top",
      "topLeft",
      "left",
      "bottomLeft",
    ];
    for (let index = 0; index < ids.length; index += 1) {
      const current = `${entity.id}.${ids[index]}`;
      const next = `${entity.id}.${ids[(index + 1) % ids.length]}`;
      definitions[0]!.constraints.push(
        coincident(`${entity.id}.corner${index}`, `${current}.end`, `${next}.start`),
      );
    }
    return definitions;
  }
  if (entity.type === "line")
    return [lineDefinition(entity.id, entity.from, entity.to, units, entity.construction)];
  if (entity.type === "circle" || entity.type === "arc") {
    const radius = lengthToMeters(entity.radius, units);
    const [xCenter, yCenter] = entity.center.map((value) => lengthToMeters(value as never, units));
    return [
      {
        entity: {
          btType: entity.type === "circle" ? "BTMSketchCurve-4" : "BTMSketchCurveSegment-155",
          entityId: entity.id,
          centerId: `${entity.id}.center`,
          ...(entity.type === "arc"
            ? {
                startPointId: `${entity.id}.start`,
                endPointId: `${entity.id}.end`,
                startParam: (entity.startAngle * Math.PI) / 180,
                endParam: (entity.endAngle * Math.PI) / 180,
              }
            : {}),
          isConstruction: entity.construction ?? false,
          geometry: {
            btType: "BTCurveGeometryCircle-115",
            xCenter,
            yCenter,
            radius,
            xDir: 1,
            yDir: 0,
            clockwise: false,
          },
        },
        constraints: [fixed(entity.id)],
      },
    ];
  }
  if (entity.type === "bezier") {
    if (entity.points.length < 4 || (entity.points.length - 1) % 3 !== 0) {
      throw new Error(`Bezier ${entity.id} needs 4 + 3n control points`);
    }
    const result: SketchDefinition[] = [];
    const segmentCount = (entity.points.length - 1) / 3;
    for (let index = 0; index < segmentCount; index += 1) {
      const points = entity.points
        .slice(index * 3, index * 3 + 4)
        .flatMap((point) => point.map((value) => lengthToMeters(value as never, units)));
      const id = `${entity.id}.s${index}`;
      result.push({
        entity: {
          btType: "BTMSketchCurveSegment-155",
          entityId: id,
          startPointId: `${id}.start`,
          endPointId: `${id}.end`,
          isConstruction: entity.construction ?? false,
          geometry: {
            btType: "BTCurveGeometryControlPointSpline-2197",
            isBezier: true,
            degree: 3,
            controlPoints: points,
            controlPointCount: 4,
            knots: [0, 0, 0, 0, 1, 1, 1, 1],
            isPeriodic: false,
            isRational: false,
          },
        },
        constraints: [fixed(id)],
      });
    }
    for (let index = 0; index + 1 < result.length; index += 1) {
      result[0]!.constraints.push(
        coincident(
          `${entity.id}.join${index}`,
          `${entity.id}.s${index}.end`,
          `${entity.id}.s${index + 1}.start`,
        ),
      );
    }
    if (entity.closed && result.length > 0) {
      result[0]!.constraints.push(
        coincident(
          `${entity.id}.close`,
          `${entity.id}.s${result.length - 1}.end`,
          `${entity.id}.s0.start`,
        ),
      );
    }
    return result;
  }
  if (entity.type === "point") {
    return [
      {
        entity: {
          btType: "BTMSketchPoint-158",
          entityId: entity.id,
          isConstruction: entity.construction ?? false,
          x: lengthToMeters(entity.point[0] as never, units),
          y: lengthToMeters(entity.point[1] as never, units),
        },
        constraints: [fixed(entity.id)],
      },
    ];
  }
  if (entity.type === "text") {
    return [
      {
        entity: {
          btType: "BTMSketchTextEntity-1761",
          entityId: entity.id,
          text: entity.text,
          fontName: entity.fontName ?? "Arial",
          baselineStartX: lengthToMeters(entity.baselineStart[0] as never, units),
          baselineStartY: lengthToMeters(entity.baselineStart[1] as never, units),
          baselineDirectionX: entity.baselineDirection?.[0] ?? 1,
          baselineDirectionY: entity.baselineDirection?.[1] ?? 0,
          ascent: lengthToMeters(entity.ascent, units),
        },
        constraints: [fixed(entity.id)],
      },
    ];
  }
  throw new Error(`Unsupported sketch entity: ${(entity as SketchEntity).type}`);
}

function compileConstraint(
  constraint: SketchConstraint,
  units: ModelUnits,
): Record<string, unknown> {
  const stringParameter = (parameterId: string, value: string) => ({
    btType: "BTMParameterString-149",
    parameterId,
    value,
  });
  const quantityParameter = (parameterId: string, expression: string) => ({
    btType: "BTMParameterQuantity-147",
    parameterId,
    expression,
  });
  switch (constraint.type) {
    case "coincident":
    case "equal":
    case "parallel":
    case "perpendicular":
      return {
        btType: "BTMSketchConstraint-2",
        constraintType: constraint.type.toUpperCase(),
        entityId: constraint.id,
        parameters: [
          stringParameter("localFirst", constraint.first),
          stringParameter("localSecond", constraint.second),
        ],
      };
    case "horizontal":
    case "vertical":
    case "fix":
      return {
        btType: "BTMSketchConstraint-2",
        constraintType: constraint.type.toUpperCase(),
        entityId: constraint.id,
        parameters: [stringParameter("localFirst", constraint.entity)],
      };
    case "distance":
      return {
        btType: "BTMSketchConstraint-2",
        constraintType: "DISTANCE",
        entityId: constraint.id,
        parameters: [
          stringParameter("localFirst", constraint.first),
          ...(constraint.second ? [stringParameter("localSecond", constraint.second)] : []),
          quantityParameter("length", lengthExpression(constraint.value, units)),
        ],
      };
    case "diameter":
      return {
        btType: "BTMSketchConstraint-2",
        constraintType: "DIAMETER",
        entityId: constraint.id,
        parameters: [
          stringParameter("localFirst", constraint.entity),
          quantityParameter("length", lengthExpression(constraint.value, units)),
        ],
      };
  }
}

function parameter(
  type: "Enum" | "QueryList" | "Quantity" | "Boolean",
  parameterId: string,
  value: unknown,
  enumName?: string,
) {
  if (type === "QueryList")
    return { btType: "BTMParameterQueryList-148", parameterId, queries: value };
  if (type === "Quantity")
    return { btType: "BTMParameterQuantity-147", parameterId, expression: value };
  if (type === "Boolean") return { btType: "BTMParameterBoolean-144", parameterId, value };
  return { btType: "BTMParameterEnum-145", parameterId, enumName, value };
}

function resolveRawValue(value: unknown, resolve: FeatureIdResolver): unknown {
  if (typeof value === "string") {
    return value.replace(
      /\$feature\(([^)]+)\)/g,
      (_match, id: string) => `makeId("${resolve(id)}")`,
    );
  }
  if (Array.isArray(value)) return value.map((item) => resolveRawValue(item, resolve));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveRawValue(item, resolve)]),
    );
  }
  return value;
}

export function featureLabel(modelName: string, feature: Pick<FeatureNode, "id" | "name">): string {
  return `CS[${encodeURIComponent(modelName)}/${feature.id}] ${feature.name ?? feature.id}`;
}

export function parseFeatureLabel(
  label: string,
): { modelName: string; symbolicId: string } | undefined {
  const match = /^CS\[([^/]+)\/([^\]]+)\]/.exec(label);
  return match ? { modelName: decodeURIComponent(match[1]!), symbolicId: match[2]! } : undefined;
}

export function compileFeature(
  model: Pick<MaterializedModel, "name" | "units">,
  feature: FeatureNode,
  resolve: FeatureIdResolver,
): Record<string, unknown> {
  const name = featureLabel(model.name, feature);
  if (feature.kind === "sketch") {
    const definitions = expandSketchEntities(feature.entities).flatMap((entity) =>
      compileSketchEntity(entity, model.units),
    );
    return {
      btType: "BTFeatureDefinitionCall-1406",
      feature: {
        btType: "BTMSketch-151",
        featureType: "newSketch",
        name,
        parameters: [parameter("QueryList", "sketchPlane", [planeQuery(feature.plane, resolve)])],
        entities: definitions.map((definition) => definition.entity),
        constraints: [
          ...definitions.flatMap((definition) => definition.constraints),
          ...feature.constraints.map((constraint) => compileConstraint(constraint, model.units)),
        ],
      },
    };
  }

  const parameters: Record<string, unknown>[] = [];
  if (feature.kind === "extrude") {
    const profileQuery =
      feature.profile.type === "feature"
        ? { btType: "BTMIndividualSketchRegionQuery-140", featureId: resolve(feature.profile.id) }
        : individualQuery(feature.profile, resolve);
    parameters.push(
      parameter("Enum", "bodyType", feature.bodyType, "ExtendedToolBodyType"),
      parameter("Enum", "operationType", feature.operation, "NewBodyOperationType"),
      parameter("QueryList", "entities", [profileQuery]),
      parameter("Enum", "endBound", feature.endBound, "BoundingType"),
    );
    if (
      feature.depth !== undefined &&
      !["THROUGH_ALL", "UP_TO_SURFACE", "UP_TO_BODY", "UP_TO_VERTEX"].includes(feature.endBound)
    )
      parameters.push(parameter("Quantity", "depth", lengthExpression(feature.depth, model.units)));
    if (feature.endBoundEntity) {
      const parameterId =
        feature.endBound === "UP_TO_SURFACE"
          ? "endBoundEntityFace"
          : feature.endBound === "UP_TO_VERTEX"
            ? "endBoundEntityVertex"
            : "endBoundEntityBody";
      parameters.push(
        parameter("QueryList", parameterId, [individualQuery(feature.endBoundEntity, resolve)]),
      );
    }
    if (feature.offsetDistance !== undefined) {
      parameters.push(
        parameter(
          "Quantity",
          "offsetDistance",
          lengthExpression(feature.offsetDistance, model.units),
        ),
        parameter("Boolean", "hasOffset", true),
      );
    }
    if (feature.oppositeDirection) parameters.push(parameter("Boolean", "oppositeDirection", true));
    if (feature.secondDirectionDepth !== undefined || feature.secondDirectionBound !== undefined) {
      const secondBound = feature.secondDirectionBound ?? "BLIND";
      parameters.push(parameter("Boolean", "hasSecondDirection", true));
      parameters.push(parameter("Enum", "secondDirectionBound", secondBound, "BoundingType"));
      if (
        feature.secondDirectionDepth !== undefined &&
        !["THROUGH_ALL", "UP_TO_SURFACE", "UP_TO_BODY", "UP_TO_VERTEX"].includes(secondBound)
      ) {
        parameters.push(
          parameter(
            "Quantity",
            "secondDirectionDepth",
            lengthExpression(feature.secondDirectionDepth, model.units),
          ),
        );
      }
      if (feature.secondDirectionEndBoundEntity) {
        const parameterId =
          secondBound === "UP_TO_SURFACE"
            ? "secondDirectionEndBoundEntityFace"
            : secondBound === "UP_TO_VERTEX"
              ? "secondDirectionEndBoundEntityVertex"
              : "secondDirectionEndBoundEntityBody";
        parameters.push(
          parameter("QueryList", parameterId, [
            individualQuery(feature.secondDirectionEndBoundEntity, resolve),
          ]),
        );
      }
    }
    if (feature.filterInnerLoops && feature.profile.type === "feature") {
      (profileQuery as Record<string, unknown>).filterInnerLoops = true;
    }
    if (feature.scope) {
      parameters.push(parameter("Boolean", "defaultScope", false));
      parameters.push(
        parameter("QueryList", "booleanScope", [individualQuery(feature.scope, resolve)]),
      );
    }
  } else if (feature.kind === "revolve") {
    parameters.push(
      parameter("Enum", "bodyType", "SOLID", "ExtendedToolBodyType"),
      parameter("Enum", "operationType", feature.operation, "NewBodyOperationType"),
      parameter("QueryList", "entities", [
        { btType: "BTMIndividualSketchRegionQuery-140", featureId: resolve(feature.profile.id) },
      ]),
      parameter("QueryList", "axis", [individualQuery(feature.axis, resolve)]),
      parameter("Enum", "revolveType", feature.revolveType, "RevolveType"),
    );
    if (feature.angle !== undefined && feature.revolveType !== "FULL")
      parameters.push(parameter("Quantity", "angle", angleExpression(feature.angle)));
  } else if (feature.kind === "fillet" || feature.kind === "chamfer") {
    parameters.push(parameter("QueryList", "entities", [individualQuery(feature.edges, resolve)]));
    parameters.push(
      parameter(
        "Quantity",
        feature.kind === "fillet" ? "radius" : "width",
        lengthExpression(feature.kind === "fillet" ? feature.radius : feature.width, model.units),
      ),
    );
    if (feature.kind === "chamfer") {
      parameters.push(
        parameter("Enum", "chamferType", feature.chamferType ?? "EQUAL_OFFSETS", "ChamferType"),
      );
      if (feature.angle !== undefined)
        parameters.push(parameter("Quantity", "angle", angleExpression(feature.angle)));
    }
  } else if (feature.kind === "boolean") {
    parameters.push(parameter("Enum", "operationType", feature.operation, "BooleanOperationType"));
    parameters.push(
      parameter(
        "QueryList",
        "tools",
        feature.tools.map((query) => individualQuery(query, resolve)),
      ),
    );
    if (feature.targets?.length)
      parameters.push(
        parameter(
          "QueryList",
          "targets",
          feature.targets.map((query) => individualQuery(query, resolve)),
        ),
      );
  } else if (feature.kind === "plane") {
    const referenceQuery =
      feature.reference.type === "plane"
        ? planeQuery(feature.reference, resolve)
        : individualQuery(feature.reference, resolve);
    parameters.push(parameter("QueryList", "entities", [referenceQuery]));
    parameters.push(parameter("Enum", "cplaneType", feature.planeType ?? "OFFSET", "CPlaneType"));
    if (feature.offset !== undefined)
      parameters.push(
        parameter("Quantity", "offset", lengthExpression(feature.offset, model.units)),
      );
    if (feature.angle !== undefined)
      parameters.push(parameter("Quantity", "angle", angleExpression(feature.angle)));
    if (feature.oppositeDirection) parameters.push(parameter("Boolean", "oppositeDirection", true));
  } else if (feature.kind === "split") {
    const toolQuery =
      feature.tool.type === "plane"
        ? planeQuery(feature.tool, resolve)
        : individualQuery(feature.tool, resolve);
    parameters.push(parameter("QueryList", "tool", [toolQuery]));
    parameters.push(
      parameter(
        "QueryList",
        "targets",
        feature.targets.map((query) => individualQuery(query, resolve)),
      ),
    );
  } else if (feature.kind === "transform") {
    parameters.push(
      parameter(
        "QueryList",
        "entities",
        feature.bodies.map((query) => individualQuery(query, resolve)),
      ),
    );
    parameters.push(
      parameter(
        "Enum",
        "transformType",
        feature.transformType ?? "TRANSLATION_3D",
        "TransformType",
      ),
    );
    if (feature.translation) {
      for (const [index, id] of ["dx", "dy", "dz"].entries())
        parameters.push(
          parameter(
            "Quantity",
            id,
            lengthExpression(feature.translation[index] as never, model.units),
          ),
        );
    }
    if (feature.makeCopy) parameters.push(parameter("Boolean", "makeCopy", true));
  } else if (feature.kind === "shell") {
    parameters.push(parameter("Boolean", "isHollow", feature.hollow ?? false));
    parameters.push(
      parameter("Quantity", "thickness", lengthExpression(feature.thickness, model.units)),
    );
    if (feature.hollow && feature.parts)
      parameters.push(
        parameter(
          "QueryList",
          "parts",
          feature.parts.map((query) => individualQuery(query, resolve)),
        ),
      );
    if (!feature.hollow && feature.faces)
      parameters.push(
        parameter(
          "QueryList",
          "entities",
          feature.faces.map((query) => individualQuery(query, resolve)),
        ),
      );
    if (feature.oppositeDirection) parameters.push(parameter("Boolean", "oppositeDirection", true));
  } else if (feature.kind === "raw") {
    parameters.push(
      ...feature.parameters.map(
        (item) => resolveRawValue(item, resolve) as Record<string, unknown>,
      ),
    );
  }

  const featureType =
    feature.kind === "boolean"
      ? "booleanBodies"
      : feature.kind === "plane"
        ? "cPlane"
        : feature.kind === "split"
          ? "splitPart"
          : feature.kind === "raw"
            ? feature.featureType
            : feature.kind;
  return {
    btType: "BTFeatureDefinitionCall-1406",
    feature: { btType: "BTMFeature-134", featureType, name, parameters },
  };
}
