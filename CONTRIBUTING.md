# Contributing

Issues and focused pull requests are welcome. Start with a discussion before changing the model format, bridge protocol, ownership rules, or plan/apply semantics.

1. Fork and clone the repository.
2. Run `corepack enable && pnpm install`.
3. Add tests and a `coverage/catalog.ts` entry for new CAD surface area.
4. Run `pnpm validate`.
5. Add a Changeset for user-facing package changes.

Do not commit personal Onshape document IDs, cookies, bridge tokens, model state, or private design files. Public examples should be small, generic, printable, and clearly licensed.
