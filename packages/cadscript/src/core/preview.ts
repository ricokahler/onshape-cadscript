import { Resvg } from "@resvg/resvg-js";
import { expandSketchEntities } from "./svg.js";
import type { MaterializedModel, Point2, SketchEntity } from "./types.js";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function entityPoints(entity: SketchEntity): Point2[] {
  switch (entity.type) {
    case "line":
      return [entity.from, entity.to];
    case "circle":
    case "arc":
      return [
        [entity.center[0] - entity.radius, entity.center[1] - entity.radius],
        [entity.center[0] + entity.radius, entity.center[1] + entity.radius],
      ];
    case "rectangle":
    case "roundedRectangle":
      return [entity.corner1, entity.corner2];
    case "bezier":
      return [...entity.points];
    case "point":
      return [entity.point];
    case "text":
      return [
        entity.baselineStart,
        [
          entity.baselineStart[0] + entity.text.length * entity.ascent * 0.6,
          entity.baselineStart[1] + entity.ascent,
        ],
      ];
    case "svg":
      return [];
  }
}

function boundsFor(entities: readonly SketchEntity[]): Bounds {
  const points = entities.flatMap(entityPoints);
  if (points.length === 0) return { minX: -10, minY: -10, maxX: 10, maxY: 10 };
  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
}

export function renderSketchSvg(model: MaterializedModel, sketchId?: string): string {
  const sketch = model.features.find(
    (feature) => feature.kind === "sketch" && (!sketchId || feature.id === sketchId),
  );
  if (!sketch || sketch.kind !== "sketch")
    throw new Error(sketchId ? `Sketch ${sketchId} not found` : "Model contains no sketches");
  const entities = expandSketchEntities(sketch.entities);
  const bounds = boundsFor(entities);
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const padding = Math.max(width, height) * 0.12;
  const view = {
    x: bounds.minX - padding,
    y: -(bounds.maxY + padding),
    width: width + padding * 2,
    height: height + padding * 2,
  };
  const stroke = Math.max(width, height) / 300;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.x} ${view.y} ${view.width} ${view.height}" width="1000" height="1000">`,
    `<rect x="${view.x}" y="${view.y}" width="${view.width}" height="${view.height}" fill="#f8fafc"/>`,
    `<g transform="scale(1,-1)" fill="none" stroke="#0f172a" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">`,
  ];

  for (const entity of entities) {
    switch (entity.type) {
      case "line":
        parts.push(
          `<line id="${escapeXml(entity.id)}" x1="${entity.from[0]}" y1="${entity.from[1]}" x2="${entity.to[0]}" y2="${entity.to[1]}"${entity.construction ? ' stroke-dasharray="2 2" stroke="#94a3b8"' : ""}/>`,
        );
        break;
      case "circle":
        parts.push(
          `<circle id="${escapeXml(entity.id)}" cx="${entity.center[0]}" cy="${entity.center[1]}" r="${entity.radius}"${entity.construction ? ' stroke-dasharray="2 2" stroke="#94a3b8"' : ""}/>`,
        );
        break;
      case "arc": {
        const start = [
          entity.center[0] + entity.radius * Math.cos((entity.startAngle * Math.PI) / 180),
          entity.center[1] + entity.radius * Math.sin((entity.startAngle * Math.PI) / 180),
        ];
        const end = [
          entity.center[0] + entity.radius * Math.cos((entity.endAngle * Math.PI) / 180),
          entity.center[1] + entity.radius * Math.sin((entity.endAngle * Math.PI) / 180),
        ];
        const span = (((entity.endAngle - entity.startAngle) % 360) + 360) % 360;
        parts.push(
          `<path id="${escapeXml(entity.id)}" d="M ${start[0]} ${start[1]} A ${entity.radius} ${entity.radius} 0 ${span > 180 ? 1 : 0} 1 ${end[0]} ${end[1]}"/>`,
        );
        break;
      }
      case "rectangle": {
        const x = Math.min(entity.corner1[0], entity.corner2[0]);
        const y = Math.min(entity.corner1[1], entity.corner2[1]);
        parts.push(
          `<rect id="${escapeXml(entity.id)}" x="${x}" y="${y}" width="${Math.abs(entity.corner2[0] - entity.corner1[0])}" height="${Math.abs(entity.corner2[1] - entity.corner1[1])}"/>`,
        );
        break;
      }
      case "roundedRectangle": {
        const x = Math.min(entity.corner1[0], entity.corner2[0]);
        const y = Math.min(entity.corner1[1], entity.corner2[1]);
        parts.push(
          `<rect id="${escapeXml(entity.id)}" x="${x}" y="${y}" width="${Math.abs(entity.corner2[0] - entity.corner1[0])}" height="${Math.abs(entity.corner2[1] - entity.corner1[1])}" rx="${entity.radius}"/>`,
        );
        break;
      }
      case "bezier": {
        const first = entity.points[0];
        if (!first) throw new Error(`Bezier ${entity.id} has no points`);
        let path = `M ${first[0]} ${first[1]}`;
        for (let index = 1; index + 2 < entity.points.length; index += 3) {
          const control1 = entity.points[index]!;
          const control2 = entity.points[index + 1]!;
          const end = entity.points[index + 2]!;
          path += ` C ${control1[0]} ${control1[1]}, ${control2[0]} ${control2[1]}, ${end[0]} ${end[1]}`;
        }
        if (entity.closed) path += " Z";
        parts.push(`<path id="${escapeXml(entity.id)}" d="${path}"/>`);
        break;
      }
      case "point":
        parts.push(
          `<circle id="${escapeXml(entity.id)}" cx="${entity.point[0]}" cy="${entity.point[1]}" r="${stroke * 2}" fill="#0f172a"/>`,
        );
        break;
      case "text":
        parts.push(
          `</g><text x="${entity.baselineStart[0]}" y="${-entity.baselineStart[1]}" font-size="${entity.ascent}" font-family="${escapeXml(entity.fontName ?? "Arial")}" fill="#0f172a">${escapeXml(entity.text)}</text><g transform="scale(1,-1)" fill="none" stroke="#0f172a" stroke-width="${stroke}">`,
        );
        break;
      case "svg":
        break;
    }
  }
  parts.push(
    "</g>",
    `<text x="${view.x + stroke * 4}" y="${view.y + stroke * 12}" font-family="system-ui,sans-serif" font-size="${stroke * 7}" fill="#64748b">${escapeXml(model.name)} / ${escapeXml(sketch.id)} (${model.units})</text>`,
    "</svg>",
  );
  return parts.join("\n");
}

export function renderSketchPng(model: MaterializedModel, sketchId?: string): Uint8Array {
  const svg = renderSketchSvg(model, sketchId);
  return new Resvg(svg, { fitTo: { mode: "width", value: 1000 } }).render().asPng();
}
