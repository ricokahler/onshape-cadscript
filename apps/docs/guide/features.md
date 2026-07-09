# Features

v0.1 includes sketch, extrude, revolve, fillet, chamfer, boolean bodies, offset plane, 3D translation, and shell. A raw feature parameter escape hatch exists for experiments but is not stable API.

```ts
const body =
  yield *
  cad.extrude({
    id: "body",
    profile,
    depth: length(18),
  });

yield *
  cad.fillet({
    id: "outer-round",
    edges: cad.edges(body),
    radius: length(2),
  });
```

See [coverage](/reference/coverage) for maturity, tests, and target release by feature.
