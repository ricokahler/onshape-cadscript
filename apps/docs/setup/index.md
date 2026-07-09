# Setup

## Requirements

- macOS 13 or newer
- Google Chrome
- Node.js 22.14 or newer
- Codex CLI or the Codex desktop app
- An Onshape account signed in through Chrome

## Fastest Path

Tell Codex:

> Install and configure Onshape CadScript from github.com/ricokahler/onshape-cadscript, connect it to my Onshape browser session, and create a new printable CAD project.

Or install manually:

```sh
codex plugin marketplace add ricokahler/onshape-cadscript --sparse .agents/plugins
codex plugin add onshape-cadscript@onshape-cadscript
npx -y onshape-cadscript@0.1.1 setup codex
```

Continue with [Codex setup](./codex) and [Chrome bridge setup](./chrome).
