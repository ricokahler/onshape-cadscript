# CadScript Coverage

Generated from `coverage/catalog.ts`. Endpoint availability alone does not count as support; every entry records implementation maturity, tests, documentation, and release intent.

**22 stable** | **24 experimental** | **2 raw escape hatches** | **8 planned**

## SKETCH

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Line | BTMSketchCurveSegment / line | `sketch.line` | stable | unit | guide | 0.1.0 | v0.1 |
| Circle | BTMSketchCurve / circle | `sketch.circle` | stable | unit | guide | 0.1.0 | v0.1 |
| Circular arc | BTMSketchCurveSegment / circle | `sketch.arc` | experimental | unit | guide | 0.1.0 | v0.1 |
| Rectangle | four line entities | `sketch.rectangle` | stable | unit | guide | 0.1.0 | v0.1 |
| Rounded rectangle | lines and circular arcs | `sketch.roundedRectangle` | stable | unit | guide | 0.1.0 | v0.1 |
| Cubic Bezier spline | control point spline | `sketch.bezier` | experimental | unit | guide | 0.1.0 | v0.1 |
| Sketch point | BTMSketchPoint | `sketch.point` | stable | unit | guide | 0.1.0 | v0.1 |
| Sketch text | BTMSketchTextEntity | `sketch.text` | experimental | unit | guide | 0.1.0 | v0.1 |
| SVG import | compiled sketch entities | `sketch.svg / importSvg` | experimental | unit + example | SVG guide | 0.1.0 | v0.1 |
| Basic geometric constraints | BTMSketchConstraint | `constrain.*` | experimental | unit | guide | 0.1.0 | v0.1 |
| Advanced dimensional constraints | BTMSketchConstraint | `planned` | planned | planned | roadmap | 0.2.0 | v0.2 |

## FEATURE

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sketch | newSketch | `cad.sketch` | stable | unit | guide | 0.1.0 | v0.1 |
| Extrude | extrude | `cad.extrude` | stable | unit | guide | 0.1.0 | v0.1 |
| Revolve | revolve | `cad.revolve` | stable | unit | guide | 0.1.0 | v0.1 |
| Fillet | fillet | `cad.fillet` | experimental | unit | guide | 0.1.0 | v0.1 |
| Chamfer | chamfer | `cad.chamfer` | experimental | unit | guide | 0.1.0 | v0.1 |
| Boolean bodies | booleanBodies | `cad.boolean` | experimental | unit | guide | 0.1.0 | v0.1 |
| Offset construction plane | cPlane | `cad.plane` | experimental | unit | guide | 0.1.0 | v0.1 |
| 3D translation | transform | `cad.transform` | experimental | unit | guide | 0.1.0 | v0.1 |
| Shell | shell | `cad.shell` | experimental | unit | guide | 0.1.0 | v0.1 |
| Raw feature parameters | feature definition call | `cad.rawFeature` | raw escape hatch | unit | guide | 0.1.0 | v0.1 |
| Loft | loft | `planned` | planned | planned | roadmap | 0.2.0 | v0.2 |
| Sweep | sweep | `planned` | planned | planned | roadmap | 0.2.0 | v0.2 |
| Configurations | configuration API | `planned` | planned | planned | roadmap | 0.3.0 | v0.3 |
| Assemblies and mates | assembly APIs | `planned` | planned | planned | roadmap | 0.3.0 | v0.3 |

## QUERY

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Created-by entity query | qCreatedBy | `cad.bodies/faces/edges/vertices` | stable | unit | guide | 0.1.0 | v0.1 |
| Sketch entity query | sketchEntityQuery | `cad.sketchEntity` | stable | unit | guide | 0.1.0 | v0.1 |
| Extrude cap query | qCapEntity | `cad.cap` | experimental | unit | guide | 0.1.0 | v0.1 |
| Owned-by-body query | qOwnedByBody | `cad.ownedByBody` | experimental | unit | guide | 0.1.0 | v0.1 |
| Geometry filter | qGeometry | `cad.geometry` | experimental | unit | guide | 0.1.0 | v0.1 |
| Closest-to query | qClosestTo | `cad.closestTo` | experimental | unit | guide | 0.1.0 | v0.1 |
| Raw FeatureScript query | arbitrary query expression | `cad.rawQuery` | raw escape hatch | unit | guide | 0.1.0 | v0.1 |

## REST

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| List documents | Documents: getDocuments | `OnshapeClient.listDocuments` | stable | unit | guide | 0.1.0 | v0.1 |
| Create document | Documents: createDocument | `OnshapeClient.createDocument` | experimental | unit | guide | 0.1.0 | v0.1 |
| List elements | Documents: getElementsInDocument | `OnshapeClient.listElements` | stable | unit | guide | 0.1.0 | v0.1 |
| Read feature list | Part Studios: getFeatures | `OnshapeClient.observe` | stable | unit | guide | 0.1.0 | v0.1 |
| Add/update/delete feature | Part Studios: feature operations | `plan/apply runtime` | experimental | unit + live pending | guide | 0.1.0 | v0.1 |
| Shaded view | Part Studios: shadedViews | `OnshapeClient.render` | stable | unit | guide | 0.1.0 | v0.1 |
| Fixed measurements | Part Studios: evalFeatureScript | `OnshapeClient.evaluateFeatureScript` | experimental | unit | guide | 0.1.0 | v0.1 |
| STL export | Part Studios: exportStl | `OnshapeClient.exportStl` | stable | unit | guide | 0.1.0 | v0.1 |
| Version checkpoint | Documents: createVersion | `OnshapeClient.createCheckpoint` | experimental | unit | guide | 0.1.0 | v0.1 |

## MCP

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Project inspection | local model | `cadscript_project_inspect` | stable | unit | guide | 0.1.0 | v0.1 |
| Bridge health | local bridge | `cadscript_bridge_health` | stable | unit | guide | 0.1.0 | v0.1 |
| Document navigation | Documents REST | `onshape_documents` | stable | unit | guide | 0.1.0 | v0.1 |
| Dedicated project creation | Documents and Part Studios REST | `onshape_project_create` | experimental | unit | guide | 0.1.0 | v0.1 |
| Current selection | narrow page adapter | `onshape_selection` | experimental | unit | guide | 0.1.0 | v0.1 |
| Part Studio observation | Part Studios REST | `onshape_partstudio_observe` | stable | unit | guide | 0.1.0 | v0.1 |
| Read-only model plan | local + Part Studios REST | `cadscript_model_plan` | stable | unit | guide | 0.1.0 | v0.1 |
| Exact-plan apply and verify | Part Studios REST | `cadscript_model_apply` | experimental | unit | guide | 0.1.0 | v0.1 |
| Rendered image content | shaded views | `onshape_render` | stable | unit | guide | 0.1.0 | v0.1 |
| Bounds and mass | FeatureScript | `onshape_measure` | experimental | unit | guide | 0.1.0 | v0.1 |
| Verified STL export | STL REST | `onshape_export_stl` | stable | unit | guide | 0.1.0 | v0.1 |

## LIVE

| Capability | Onshape surface | CadScript API | Status | Tests | Docs | Release | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Signed-in browser session | Chrome MV3 + native messaging | `cadscript doctor` | experimental | manual macOS smoke | setup guide | 0.1.0 | v0.1 |
| Plan/apply/render/no-op | dedicated Part Studio | `end-to-end smoke` | planned | release gate | release checklist | 0.1.0 | v0.1 |
| Clean-machine macOS onboarding | npm + Codex + Chrome | `release smoke` | planned | release gate | release checklist | 0.1.0 | v0.1 |
| Windows and Linux bridge | native messaging | `planned` | planned | planned | roadmap | 1.0.0 | v1.0 |
