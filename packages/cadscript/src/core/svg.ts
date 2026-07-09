import { XMLParser } from "fast-xml-parser";
import { SVGPathData } from "svg-pathdata";
import type { Length, Point2, SketchEntity } from "./types.js";

type SvgNode = Record<string, unknown>;

function list<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function number(value: unknown, fallback = 0): number {
  const result = Number.parseFloat(String(value ?? fallback));
  return Number.isFinite(result) ? result : fallback;
}

function pointList(value: unknown): Point2[] {
  const values = String(value ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
  const points: Point2[] = [];
  for (let index = 0; index + 1 < values.length; index += 2)
    points.push([values[index]!, values[index + 1]!]);
  return points;
}

function transformPoint(point: Point2, scale: number, translate: Point2): Point2 {
  return [point[0] * scale + translate[0], -(point[1] * scale) + translate[1]];
}

function pathEntities(id: string, path: string, scale: number, translate: Point2): SketchEntity[] {
  const commands = new SVGPathData(path).toAbs().normalizeHVZ().commands;
  const entities: SketchEntity[] = [];
  let current: Point2 = [0, 0];
  let start: Point2 = [0, 0];
  let segment = 0;

  for (const command of commands) {
    const commandWithPoint = command as typeof command & {
      x?: number;
      y?: number;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
    };
    if (command.type === SVGPathData.MOVE_TO) {
      current = [commandWithPoint.x ?? 0, commandWithPoint.y ?? 0];
      start = current;
      continue;
    }
    if (command.type === SVGPathData.LINE_TO) {
      const end: Point2 = [commandWithPoint.x ?? 0, commandWithPoint.y ?? 0];
      entities.push({
        type: "line",
        id: `${id}.${segment++}`,
        from: transformPoint(current, scale, translate),
        to: transformPoint(end, scale, translate),
      });
      current = end;
      continue;
    }
    if (command.type === SVGPathData.CURVE_TO) {
      const end: Point2 = [commandWithPoint.x ?? 0, commandWithPoint.y ?? 0];
      entities.push({
        type: "bezier",
        id: `${id}.${segment++}`,
        points: [
          transformPoint(current, scale, translate),
          transformPoint([commandWithPoint.x1 ?? 0, commandWithPoint.y1 ?? 0], scale, translate),
          transformPoint([commandWithPoint.x2 ?? 0, commandWithPoint.y2 ?? 0], scale, translate),
          transformPoint(end, scale, translate),
        ],
      });
      current = end;
      continue;
    }
    if (command.type === SVGPathData.CLOSE_PATH) {
      if (current[0] !== start[0] || current[1] !== start[1]) {
        entities.push({
          type: "line",
          id: `${id}.${segment++}`,
          from: transformPoint(current, scale, translate),
          to: transformPoint(start, scale, translate),
        });
      }
      current = start;
      continue;
    }
    throw new Error(
      `SVG path ${id} contains an unsupported command. Convert arcs and quadratic curves to cubic paths first.`,
    );
  }
  return entities;
}

function visit(
  node: SvgNode,
  prefix: string,
  scale: number,
  translate: Point2,
  output: SketchEntity[],
): void {
  let index = 0;
  for (const path of list(node.path as SvgNode | SvgNode[] | undefined)) {
    output.push(
      ...pathEntities(`${prefix}.path${index++}`, String(path["@_d"] ?? ""), scale, translate),
    );
  }
  index = 0;
  for (const line of list(node.line as SvgNode | SvgNode[] | undefined)) {
    output.push({
      type: "line",
      id: `${prefix}.line${index++}`,
      from: transformPoint([number(line["@_x1"]), number(line["@_y1"])], scale, translate),
      to: transformPoint([number(line["@_x2"]), number(line["@_y2"])], scale, translate),
    });
  }
  index = 0;
  for (const circle of list(node.circle as SvgNode | SvgNode[] | undefined)) {
    output.push({
      type: "circle",
      id: `${prefix}.circle${index++}`,
      center: transformPoint([number(circle["@_cx"]), number(circle["@_cy"])], scale, translate),
      radius: (number(circle["@_r"]) * scale) as Length,
    });
  }
  index = 0;
  for (const rect of list(node.rect as SvgNode | SvgNode[] | undefined)) {
    const x = number(rect["@_x"]);
    const y = number(rect["@_y"]);
    const width = number(rect["@_width"]);
    const height = number(rect["@_height"]);
    const radius = Math.max(number(rect["@_rx"]), number(rect["@_ry"])) * scale;
    output.push({
      type: radius > 0 ? "roundedRectangle" : "rectangle",
      id: `${prefix}.rect${index++}`,
      corner1: transformPoint([x, y + height], scale, translate),
      corner2: transformPoint([x + width, y], scale, translate),
      ...(radius > 0 ? { radius: radius as Length } : {}),
    } as SketchEntity);
  }
  for (const kind of ["polyline", "polygon"] as const) {
    index = 0;
    for (const polygon of list(node[kind] as SvgNode | SvgNode[] | undefined)) {
      const points = pointList(polygon["@_points"]);
      const limit = kind === "polygon" ? points.length : points.length - 1;
      for (let pointIndex = 0; pointIndex < limit; pointIndex += 1) {
        output.push({
          type: "line",
          id: `${prefix}.${kind}${index}.${pointIndex}`,
          from: transformPoint(points[pointIndex]!, scale, translate),
          to: transformPoint(points[(pointIndex + 1) % points.length]!, scale, translate),
        });
      }
      index += 1;
    }
  }
  index = 0;
  for (const group of list(node.g as SvgNode | SvgNode[] | undefined))
    visit(group, `${prefix}.g${index++}`, scale, translate, output);
}

export function importSvg(
  source: string,
  options: { id?: string; scale?: number; translate?: Point2 } = {},
): SketchEntity[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
  });
  const parsed = parser.parse(source) as { svg?: SvgNode };
  if (!parsed.svg) throw new Error("SVG input must contain an <svg> root element");
  const output: SketchEntity[] = [];
  visit(parsed.svg, options.id ?? "svg", options.scale ?? 1, options.translate ?? [0, 0], output);
  if (output.length === 0)
    throw new Error(
      "SVG did not contain any supported path, line, circle, rectangle, or polygon geometry",
    );
  return output;
}

export function expandSketchEntities(entities: readonly SketchEntity[]): SketchEntity[] {
  return entities.flatMap((entity) =>
    entity.type === "svg"
      ? importSvg(entity.source, {
          id: entity.id,
          ...(entity.scale !== undefined ? { scale: entity.scale } : {}),
          ...(entity.translate !== undefined ? { translate: entity.translate } : {}),
        })
      : [entity],
  );
}
