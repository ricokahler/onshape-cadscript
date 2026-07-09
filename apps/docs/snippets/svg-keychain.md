```ts
import { readFileSync } from "node:fs";
import { defineModel, length, sketch } from "onshape-cadscript";

const badge = readFileSync(new URL("./badge.svg", import.meta.url), "utf8");

export default defineModel({
  name: "svg-keychain",
  units: "mm",
  parameters: {},
  async *build(cad) {
    const profile = yield* cad.sketch({
      id: "badge-profile",
      plane: cad.top,
      entities: [sketch.svg("badge", badge, { translate: [-25, 12] })],
    });
    yield* cad.extrude({ id: "badge", profile, depth: length(3) });
  },
});
```
