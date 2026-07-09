# SVG Import

`sketch.svg` parses SVG paths, lines, circles, rectangles, polylines, and polygons into normal sketch entities.

<!--@include: ../snippets/svg-keychain.md-->

The SVG Y axis is flipped into CAD's Y-up coordinate system. Apply `scale` and `translate` explicitly. Convert quadratic curves and elliptical arcs to cubic paths before import in v0.1.

Because import returns the shared sketch AST, local preview and Onshape receive the same normalized geometry.
