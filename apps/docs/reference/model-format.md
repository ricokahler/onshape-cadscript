# Model Format Reference

Model format version: **1 (experimental)**.

The public types are generated at [TypeDoc API](/api/). Core entry points are:

- `defineModel()` and `materializeModel()`
- `length()`, `angle()`, and parameter specs
- `sketch` and `constrain`
- `Cad` feature generators and typed query helpers
- `defineProject()`

Stable IDs match `/^[a-zA-Z][a-zA-Z0-9._-]*$/`. Feature IDs are unique per model; entity IDs are unique per sketch.

The v0.1 bridge pins [Onshape REST API v15](https://onshape-public.github.io/docs/changelog/) and native feature definition structures. Coverage maturity is tracked separately from endpoint availability.

See [model files](/guide/model-files) for a tutorial and the generated [coverage table](./coverage).
