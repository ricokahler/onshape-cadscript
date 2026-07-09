import type { Angle, Length, Point2, SketchConstraint, SketchEntity } from "./types.js";

export const sketch = {
  line(
    id: string,
    from: Point2,
    to: Point2,
    options: { construction?: boolean } = {},
  ): SketchEntity {
    return { type: "line", id, from, to, ...options };
  },
  circle(
    id: string,
    center: Point2,
    radius: Length,
    options: { construction?: boolean } = {},
  ): SketchEntity {
    return { type: "circle", id, center, radius, ...options };
  },
  arc(
    id: string,
    center: Point2,
    radius: Length,
    startAngle: Angle,
    endAngle: Angle,
    options: { construction?: boolean } = {},
  ): SketchEntity {
    return { type: "arc", id, center, radius, startAngle, endAngle, ...options };
  },
  rectangle(
    id: string,
    corner1: Point2,
    corner2: Point2,
    options: { construction?: boolean } = {},
  ): SketchEntity {
    return { type: "rectangle", id, corner1, corner2, ...options };
  },
  roundedRectangle(id: string, corner1: Point2, corner2: Point2, radius: Length): SketchEntity {
    return { type: "roundedRectangle", id, corner1, corner2, radius };
  },
  bezier(
    id: string,
    points: readonly Point2[],
    options: { closed?: boolean; construction?: boolean } = {},
  ): SketchEntity {
    return { type: "bezier", id, points, ...options };
  },
  point(id: string, point: Point2, options: { construction?: boolean } = {}): SketchEntity {
    return { type: "point", id, point, ...options };
  },
  text(
    id: string,
    text: string,
    baselineStart: Point2,
    ascent: Length,
    options: { fontName?: string; baselineDirection?: Point2 } = {},
  ): SketchEntity {
    return { type: "text", id, text, baselineStart, ascent, ...options };
  },
  svg(
    id: string,
    source: string,
    options: { scale?: number; translate?: Point2 } = {},
  ): SketchEntity {
    return { type: "svg", id, source, ...options };
  },
};

export const constrain = {
  coincident(id: string, first: string, second: string): SketchConstraint {
    return { id, type: "coincident", first, second };
  },
  horizontal(id: string, entity: string): SketchConstraint {
    return { id, type: "horizontal", entity };
  },
  vertical(id: string, entity: string): SketchConstraint {
    return { id, type: "vertical", entity };
  },
  equal(id: string, first: string, second: string): SketchConstraint {
    return { id, type: "equal", first, second };
  },
  parallel(id: string, first: string, second: string): SketchConstraint {
    return { id, type: "parallel", first, second };
  },
  perpendicular(id: string, first: string, second: string): SketchConstraint {
    return { id, type: "perpendicular", first, second };
  },
  distance(id: string, first: string, value: Length, second?: string): SketchConstraint {
    return { id, type: "distance", first, value, ...(second ? { second } : {}) };
  },
  diameter(id: string, entity: string, value: Length): SketchConstraint {
    return { id, type: "diameter", entity, value };
  },
  fix(id: string, entity: string): SketchConstraint {
    return { id, type: "fix", entity };
  },
};
