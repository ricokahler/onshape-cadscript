# Model Files

A project has three important files:

```text
my-print/
  cadscript.config.ts
  model.ts
  package.json
```

Create one with `cadscript init ./my-print`.

`cadscript.config.ts` selects the model, parameters, and dedicated Part Studio target. `model.ts` is the source of truth. `.cadscript/` contains local ownership state and immutable plans and should not be committed.

Each model declares units once. Every feature has a required stable ID. `yield*` records a feature and returns a symbolic reference for later operations.

<!--@include: ../snippets/revolved-knob.md-->
