# Sketches

The shared AST supports lines, circles, circular arcs, rectangles, rounded rectangles, cubic Beziers, points, text, and SVG input.

```ts
const profile =
  yield *
  cad.sketch({
    id: "profile",
    plane: cad.top,
    entities: [
      sketch.roundedRectangle("outline", [-30, -20], [30, 20], length(4)),
      sketch.circle("mount-hole", [22, 0], length(2.2)),
    ],
  });
```

Sketch coordinates use model units. Entity IDs are stable within their sketch. Local SVG/PNG preview and Onshape compilation read the same entities.

Basic constraints are available under `constrain`, but v0.1 generated-coordinate sketches commonly use exact fixed geometry. Treat any Onshape sketch warning as a failure.
