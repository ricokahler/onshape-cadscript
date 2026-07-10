# MCP Tool Schemas

MCP schema version: **1**.

| Tool                         | Mutation | Purpose                                                          |
| ---------------------------- | -------- | ---------------------------------------------------------------- |
| `cadscript_project_inspect`  | No       | Load and validate local model and config.                        |
| `cadscript_sketch_preview`   | No       | Return SVG from the shared sketch AST.                           |
| `cadscript_bridge_health`    | No       | Check native host, extension, and Onshape tabs.                  |
| `onshape_documents`          | No       | List signed-in user's documents.                                 |
| `onshape_project_create`     | Yes      | Create a document and dedicated empty Part Studio.               |
| `onshape_selection`          | No       | Read current narrow Onshape selection.                           |
| `onshape_partstudio_observe` | No       | Read feature tree and regeneration notices.                      |
| `cadscript_model_plan`       | No       | Persist an immutable exact plan.                                 |
| `cadscript_model_apply`      | Yes      | Apply one exact plan and verify a no-op result.                  |
| `onshape_render`             | No       | Return visible PNG image content.                                |
| `onshape_measure`            | No       | Return bounds and PLA mass via fixed FeatureScript (1.24 g/cm3). |
| `onshape_export_stl`         | No       | Write and validate a millimeter STL export.                      |

There is intentionally no arbitrary API, page evaluation, FeatureScript, or feature mutation tool in the default server.
