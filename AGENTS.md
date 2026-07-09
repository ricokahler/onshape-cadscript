# Repository Instructions

## Scope

Onshape CadScript is an unofficial, local-first TypeScript SDK, CLI, MCP server, Chrome bridge, and Codex plugin for hobby CAD and 3D printing.

## Commands

- Install: `pnpm install`
- Validate: `pnpm validate`
- Focused SDK tests: `pnpm --dir packages/cadscript test`
- Build docs: `pnpm docs:build`
- Generate coverage: `pnpm coverage:generate`
- Inspect package tarballs: `pnpm packages:check`

## Design Rules

- Keep model evaluation pure and transport-independent.
- Preserve required symbolic feature IDs and the async generator `yield*` API.
- The shared sketch AST must remain the source for Onshape compilation, local preview, and SVG import.
- Keep browser access narrow: no arbitrary page evaluation, credential extraction, unrestricted origins, or unrestricted HTTP methods.
- Default MCP tools must remain workflow-level. Do not expose unrestricted feature mutation.
- Treat Onshape sketch warnings as errors.
- Any destructive apply must require an exact plan ID, reject stale microversions, and checkpoint before deletion.
- Do not add personal CAD models, document IDs, cookies, tokens, or generated `.cadscript` state.
- Add coverage catalog entries and tests when adding an API capability.

## Release Rules

- Version `onshape-cadscript` and `onshape-cadscript-codex` together with Changesets.
- Keep `.mcp.json`, the marketplace package version, extension version, and both npm package versions aligned.
- npm packages must contain compiled JavaScript and must not depend on lifecycle scripts during Codex installation.
- Verify tarball contents, clean `npx`, plugin installation, MCP startup, bridge setup, live render, no-op replan, and non-empty STL before release.
