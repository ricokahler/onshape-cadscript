# onshape-cadscript

Typed `yield*` CAD models, a safe plan/apply runtime, a local Onshape browser bridge, CLI, and MCP server.

```ts
import { defineModel, length, sketch } from "onshape-cadscript";

export default defineModel({
  name: "my-print",
  units: "mm",
  parameters: {},
  async *build(cad) {
    const profile = yield* cad.sketch({
      id: "profile",
      plane: cad.top,
      entities: [sketch.roundedRectangle("outline", [-20, -12], [20, 12], length(3))],
    });
    yield* cad.extrude({ id: "body", profile, depth: length(8) });
  },
});
```

See the [project documentation](https://ricokahler.github.io/onshape-cadscript/).

Unofficial community software. Not affiliated with or endorsed by Onshape or PTC.
