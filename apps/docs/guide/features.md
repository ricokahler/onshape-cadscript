# Features

v0.1 includes sketch, extrude, revolve, fillet, chamfer, boolean bodies, construction planes, split part, transforms, and shell. Extrudes support blind, symmetric, through-all, up-to-surface, up-to-body, and up-to-vertex bounds plus a second direction. A raw feature parameter escape hatch exists for experiments but is not stable API.

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

const splitPlane =
  yield *
  cad.plane({
    id: "split-plane",
    reference: cad.top,
    offset: length(8),
  });

yield *
  cad.split({
    id: "split-body",
    tool: { type: "plane", feature: splitPlane },
    targets: [cad.bodies(body)],
  });
```

See [coverage](/reference/coverage) for maturity, tests, and target release by feature.
