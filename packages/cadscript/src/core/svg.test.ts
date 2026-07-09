import { describe, expect, it } from "vitest";
import { importSvg } from "./svg.js";

describe("SVG import", () => {
  it("normalizes paths and basic shapes into sketch entities", () => {
    const entities = importSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 H10 V5 H0 Z"/><circle cx="4" cy="2" r="1"/></svg>',
    );
    expect(entities.filter((entity) => entity.type === "line")).toHaveLength(4);
    expect(entities.filter((entity) => entity.type === "circle")).toHaveLength(1);
  });
});
