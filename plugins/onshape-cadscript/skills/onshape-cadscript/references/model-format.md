# Model Format

CadScript models are pure TypeScript modules with a default `defineModel` export. One model owns one dedicated Onshape Part Studio.

```ts
import { defineModel, length, lengthParam, sketch } from "onshape-cadscript";

export default defineModel({
  name: "phone-stand",
  units: "mm",
  parameters: { wall: lengthParam(2.4) },
  async *build(cad, p) {
    const profile = yield* cad.sketch({
      id: "profile",
      plane: cad.top,
      entities: [sketch.roundedRectangle("outline", [-30, -20], [30, 20], length(4))],
    });
    const body = yield* cad.extrude({ id: "body", profile, depth: length(16) });
    yield* cad.fillet({ id: "edge-round", edges: cad.edges(body), radius: length(2) });
  },
});
```

## Rules

- Feature and sketch-entity IDs are required and unique within their scope.
- IDs are stable identity. Rename display `name` values freely; change an `id` only when replacing model structure intentionally.
- Numeric sketch coordinates use the model's declared units.
- Length parameters and feature dimensions use branded `Length` values returned by `length()` or `lengthParam()`.
- Angles are degrees and use `angle()`.
- `yield*` returns a symbolic feature reference. Compose selections through `cad.edges`, `cad.faces`, `cad.cap`, `cad.sketchEntity`, `cad.geometry`, and `cad.closestTo`.
- SVG input is parsed into the same sketch AST used by local preview and Onshape compilation.

`cadscript.config.ts` points at the model and contains its target IDs. Do not put browser credentials in this file.
