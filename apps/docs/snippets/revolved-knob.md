```ts
import { angle, defineModel, length, lengthParam, sketch } from "onshape-cadscript";

export default defineModel({
  name: "revolved-knob",
  units: "mm",
  parameters: {
    height: lengthParam(24),
    radius: lengthParam(15),
  },
  async *build(cad, p) {
    const profile = yield* cad.sketch({
      id: "profile",
      plane: cad.front,
      entities: [
        sketch.line("axis", [0, 0], [0, p.height], { construction: true }),
        sketch.line("bottom", [0, 0], [p.radius * 0.72, 0]),
        sketch.bezier("grip", [
          [p.radius * 0.72, 0],
          [p.radius, p.height * 0.2],
          [p.radius, p.height * 0.8],
          [p.radius * 0.72, p.height],
        ]),
        sketch.line("top", [p.radius * 0.72, p.height], [0, p.height]),
      ],
    });
    const knob = yield* cad.revolve({
      id: "knob",
      profile,
      axis: cad.sketchEntity(profile, "axis"),
      revolveType: "FULL",
      angle: angle(360),
    });
    yield* cad.fillet({ id: "soft-edges", edges: cad.edges(knob), radius: length(1.2) });
  },
});
```
