# Safe Deployment

`cadscript_model_plan` is read-only. It records the target microversion, desired model hash, and exact operations in `.cadscript/plans/<plan-id>.json`.

`cadscript_model_apply` accepts only that exact plan ID. It refuses to run when:

- the model changed after planning;
- the plan file was edited;
- the Onshape microversion changed;
- local ownership state points at missing or renamed remote features;
- a feature regenerates with an error or warning.

If feature order changes, CadScript preserves the matching prefix and replaces only the suffix. It creates an Onshape version checkpoint before the first deletion. Success requires a fresh observation and a no-op next plan.

Use a dedicated script-owned Part Studio. Never target a Part Studio containing hand-authored or unrelated features.
