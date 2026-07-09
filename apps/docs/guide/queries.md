# Queries

Feature references are symbolic until apply time. Compose typed selections rather than embedding generated Onshape IDs:

```ts
cad.edges(body);
cad.faces(body);
cad.cap(extrude, "END");
cad.sketchEntity(profile, "axis");
cad.geometry(cad.edges(body), "CIRCLE");
cad.closestTo(cad.faces(body), [0, 0, 20]);
```

`cad.rawQuery()` is an explicit escape hatch. Use `$feature(symbolic-id)` inside it when a typed helper cannot express the selection. Raw queries are not stable coverage.
