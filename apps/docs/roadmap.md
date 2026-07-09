# Roadmap

Generated from `coverage/catalog.ts`.

## v0.1 - Script To Print

Parity with the proven generator DSL, secure local browser bridge, CLI and MCP, validated parameters, shared SVG preview/import, STL export, Codex plugin, public packages, documentation, and release smokes.

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Circular arc | BTMSketchCurveSegment / circle | `sketch.arc` | experimental | unit | guide | 0.1.0 | v0.1 |
| Cubic Bezier spline | control point spline | `sketch.bezier` | experimental | unit | guide | 0.1.0 | v0.1 |
| Sketch text | BTMSketchTextEntity | `sketch.text` | experimental | unit | guide | 0.1.0 | v0.1 |
| SVG import | compiled sketch entities | `sketch.svg / importSvg` | experimental | unit + example | SVG guide | 0.1.0 | v0.1 |
| Basic geometric constraints | BTMSketchConstraint | `constrain.*` | experimental | unit | guide | 0.1.0 | v0.1 |
| Fillet | fillet | `cad.fillet` | experimental | unit | guide | 0.1.0 | v0.1 |
| Chamfer | chamfer | `cad.chamfer` | experimental | unit | guide | 0.1.0 | v0.1 |
| Boolean bodies | booleanBodies | `cad.boolean` | experimental | unit | guide | 0.1.0 | v0.1 |
| Offset construction plane | cPlane | `cad.plane` | experimental | unit | guide | 0.1.0 | v0.1 |
| 3D translation | transform | `cad.transform` | experimental | unit | guide | 0.1.0 | v0.1 |
| Shell | shell | `cad.shell` | experimental | unit | guide | 0.1.0 | v0.1 |
| Extrude cap query | qCapEntity | `cad.cap` | experimental | unit | guide | 0.1.0 | v0.1 |
| Owned-by-body query | qOwnedByBody | `cad.ownedByBody` | experimental | unit | guide | 0.1.0 | v0.1 |
| Geometry filter | qGeometry | `cad.geometry` | experimental | unit | guide | 0.1.0 | v0.1 |
| Closest-to query | qClosestTo | `cad.closestTo` | experimental | unit | guide | 0.1.0 | v0.1 |
| Create document | Documents: createDocument | `OnshapeClient.createDocument` | experimental | unit | guide | 0.1.0 | v0.1 |
| Add/update/delete feature | Part Studios: feature operations | `plan/apply runtime` | experimental | unit + live pending | guide | 0.1.0 | v0.1 |
| Fixed measurements | Part Studios: evalFeatureScript | `OnshapeClient.evaluateFeatureScript` | experimental | unit | guide | 0.1.0 | v0.1 |
| Version checkpoint | Documents: createVersion | `OnshapeClient.createCheckpoint` | experimental | unit | guide | 0.1.0 | v0.1 |
| Dedicated project creation | Documents and Part Studios REST | `onshape_project_create` | experimental | unit | guide | 0.1.0 | v0.1 |
| Current selection | narrow page adapter | `onshape_selection` | experimental | unit | guide | 0.1.0 | v0.1 |
| Exact-plan apply and verify | Part Studios REST | `cadscript_model_apply` | experimental | unit | guide | 0.1.0 | v0.1 |
| Bounds and mass | FeatureScript | `onshape_measure` | experimental | unit | guide | 0.1.0 | v0.1 |
| Signed-in browser session | Chrome MV3 + native messaging | `cadscript doctor` | experimental | manual macOS smoke | setup guide | 0.1.0 | v0.1 |
| Plan/apply/render/no-op | dedicated Part Studio | `end-to-end smoke` | planned | release gate | release checklist | 0.1.0 | v0.1 |
| Clean-machine macOS onboarding | npm + Codex + Chrome | `release smoke` | planned | release gate | release checklist | 0.1.0 | v0.1 |

## v0.2 - Richer Parts

Loft, sweep, advanced dimensional constraints, improved body naming, richer measurements, and reusable print-fit helpers.

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Advanced dimensional constraints | BTMSketchConstraint | `planned` | planned | planned | roadmap | 0.2.0 | v0.2 |
| Loft | loft | `planned` | planned | planned | roadmap | 0.2.0 | v0.2 |
| Sweep | sweep | `planned` | planned | planned | roadmap | 0.2.0 | v0.2 |

## v0.3 - Documents And Assemblies

Configurations, Variable Studios, assemblies, mates, and controlled multi-tab document workflows.

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Configurations | configuration API | `planned` | planned | planned | roadmap | 0.3.0 | v0.3 |
| Assemblies and mates | assembly APIs | `planned` | planned | planned | roadmap | 0.3.0 | v0.3 |

## v1.0 - Stable Model Format

Stable SDK and model format, migration tooling, broader desktop/browser support, mature recovery, and documented compatibility guarantees.

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Windows and Linux bridge | native messaging | `planned` | planned | planned | roadmap | 1.0.0 | v1.0 |
