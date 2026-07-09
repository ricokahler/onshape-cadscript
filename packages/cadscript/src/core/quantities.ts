import type { Angle, Length, ModelUnits } from "./types.js";

const TO_METERS: Record<ModelUnits, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  in: 0.0254,
};

export function length(value: number): Length {
  if (!Number.isFinite(value)) throw new TypeError("Length must be finite");
  return value as Length;
}

export function angle(valueDegrees: number): Angle {
  if (!Number.isFinite(valueDegrees)) throw new TypeError("Angle must be finite");
  return valueDegrees as Angle;
}

export function lengthToMeters(value: Length, units: ModelUnits): number {
  return value * TO_METERS[units];
}

export function lengthExpression(value: Length, units: ModelUnits): string {
  return `${value} ${units}`;
}

export function angleExpression(value: Angle): string {
  return `${value} deg`;
}
