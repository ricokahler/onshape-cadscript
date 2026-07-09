# Deployment Safety

`plan` is read-only and content-addressed. It records the model hash, target, base microversion, and exact add/update/delete operations.

`apply` requires that exact plan ID. It fails when the model or plan changed, the Onshape microversion is stale, ownership drifted, or regeneration contains an error or warning.

Content edits update matching features in place. Structural edits preserve the common feature prefix and replace only the suffix. CadScript creates an Onshape version checkpoint before deletion.

After mutation it rereads the feature tree, checks notices, writes ownership state, and requires the next plan to contain zero operations.

Always use a dedicated script-owned Part Studio. CadScript refuses to adopt a mixed studio.
