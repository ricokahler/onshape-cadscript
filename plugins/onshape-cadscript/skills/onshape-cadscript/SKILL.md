---
name: onshape-cadscript
description: Create and modify printable CAD models in Onshape through the onshape-cadscript TypeScript DSL and MCP tools. Use for Onshape, CAD, Part Studios, sketches, extrudes, revolves, fillets, dimensions, fit tolerances, rendered model checks, and STL export for 3D printing.
---

# Onshape CadScript

Use one checked-in `model.ts` as the source of truth. Work in the order **inspect -> edit -> preview -> plan -> apply exact plan -> render -> measure -> no-op verify -> export**.

## First Use

1. Call `cadscript_bridge_health`.
2. If the bridge is missing, run `cadscript doctor --json` in the terminal.
3. If Chrome reports no extension, open the documented Chrome Web Store listing or use the unpacked development fallback. Ask the user to click **Add to Chrome**; do not operate the Chrome install confirmation for them.
4. Ask the user to sign in to Onshape normally. Never request an Onshape password, cookie, or API key.
5. Run `cadscript bridge install --extension-id <id>` after the extension is present.
6. Re-run health, then use `onshape_documents` and a read-only `onshape_partstudio_observe` or `onshape_render` check.
7. Use a dedicated empty Part Studio for each CadScript model.

Read [model-format.md](references/model-format.md) before creating a new model and [safety.md](references/safety.md) before applying changes.

## Model Workflow

### 1. Inspect

Call `cadscript_project_inspect` before editing. Read `cadscript.config.ts`, `model.ts`, and any local design notes literally. Preserve the existing unit system, parameter conventions, and stable IDs.

If no project exists, run:

```sh
npx -y onshape-cadscript@0.1.0 init ./my-print
```

### 2. Edit The Model

Edit `model.ts` with the repository's normal patching tools. Every Part Studio feature needs a stable, descriptive `id`. Keep physical dimensions as validated parameters when the user may tune them after a test print.

Use the shared sketch AST (`sketch.line`, `sketch.circle`, `sketch.roundedRectangle`, `sketch.bezier`, `sketch.svg`) so local previews and Onshape compilation describe the same geometry. Prefer typed query composition such as `cad.edges(body)` and `cad.sketchEntity(profile, "axis")`.

Do not add raw FeatureScript queries unless the typed query API cannot express the selection. Keep any raw query narrowly scoped and explain why.

### 3. Preview

Call `cadscript_sketch_preview` after sketch edits. Check proportions, closure, orientation, holes, and imported SVG paths before touching Onshape.

### 4. Plan

Call `cadscript_model_plan`. Explain additions, updates, and deletions. A plan is read-only and content-addressed. Do not synthesize or edit a plan ID.

For a non-empty studio without local state, stop and inspect. Use `adopt: true` only if every remote feature is visibly CadScript-owned and the user intends to adopt it. Never adopt a mixed or personal Part Studio.

### 5. Apply And Verify

Call `cadscript_model_apply` with the exact plan ID returned by the immediately preceding plan. It will reject stale microversions and create an Onshape version before deletions.

After apply:

1. Require clean regeneration with no errors or warnings.
2. Call `onshape_render` in isometric and the most informative orthographic view.
3. Inspect the actual image content, not only the tool's success text.
4. Call `onshape_measure` and compare bounds with the intended dimensions.
5. Call `cadscript_model_plan` again and require zero operations.

When fit matters, record the user's test-print measurement and change a named clearance parameter rather than scattering offsets through the model.

### 6. Export

Use `onshape_export_stl` only after render, measurements, and no-op verification pass. Confirm the file is non-empty and dimensions are in millimeters.

## Guardrails

- Treat all sketch warnings as failures. Fix the sketch instead of accepting warning state.
- Never expose or use arbitrary feature mutation, arbitrary page evaluation, cookies, passwords, or API keys.
- Do not delete or replace features outside the dedicated model Part Studio.
- A screenshot is evidence, not geometry truth. Use measurements for dimensions and rendered views for visual checks.
- Web research can inform a dimension, but distinguish manufacturer specifications from measurements, scans, or community estimates.
- Keep personal model files out of the CadScript repository and examples.

## References

- [Model format](references/model-format.md)
- [Safe deployment](references/safety.md)
- [Print-fit recipes](references/print-fit.md)
