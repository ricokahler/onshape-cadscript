# STL Export

Export only after:

1. Apply reports clean regeneration.
2. Isometric and useful orthographic renders look correct.
3. Measured bounds match intended dimensions.
4. A fresh plan reports no changes.

```sh
cadscript export stl --out my-print.stl
```

The exporter requests millimeter units and rejects empty or obviously invalid STL output. Slice and inspect the STL in your normal slicer before printing.
