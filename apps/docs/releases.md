# Releases

Both npm packages are versioned together with Changesets:

- `onshape-cadscript`
- `onshape-cadscript-codex`

The marketplace entry, plugin manifest, MCP package pin, and Chrome extension version must match the release.

## Release Gate

- Validate and build from a clean checkout.
- Inspect both npm tarballs.
- Run clean `npx` and MCP startup.
- Install the plugin from the GitHub marketplace.
- Install Chrome extension and native host on a clean macOS account.
- Run read-only Onshape health and render.
- Create/select an empty Part Studio.
- Run plan, exact apply, render, measure, and no-op replan.
- Export a non-empty STL and check expected bounds.
- Publish signed GitHub release checksums, changelog, npm links, Chrome link, coverage snapshot, and extension ZIP.

After the first manual npm publish, GitHub Actions uses npm trusted publishing with OIDC and provenance.
