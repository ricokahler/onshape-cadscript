import type { Length, ParameterSpec } from "./types.js";
import { length } from "./quantities.js";

export function lengthParam(
  defaultValue: number,
  options: Omit<ParameterSpec<Length>, "kind" | "default"> = {},
): ParameterSpec<Length> {
  return { kind: "length", default: length(defaultValue), ...options };
}

export function numberParam(
  defaultValue: number,
  options: Omit<ParameterSpec<number>, "kind" | "default"> = {},
): ParameterSpec<number> {
  return { kind: "number", default: defaultValue, ...options };
}

export function booleanParam(
  defaultValue: boolean,
  options: Omit<ParameterSpec<boolean>, "kind" | "default"> = {},
): ParameterSpec<boolean> {
  return { kind: "boolean", default: defaultValue, ...options };
}

export function choiceParam<const T extends string>(
  defaultValue: T,
  choices: readonly T[],
  description?: string,
): ParameterSpec<T> {
  return {
    kind: "choice",
    default: defaultValue,
    choices,
    ...(description ? { description } : {}),
  };
}
