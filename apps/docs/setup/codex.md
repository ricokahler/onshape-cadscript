# Codex Plugin

The plugin bundles the CadScript skill and launches the matching MCP server with:

```json
{
  "command": "npx",
  "args": ["-y", "onshape-cadscript@0.1.0", "mcp", "--stdio"]
}
```

Install from the repository marketplace:

```sh
codex plugin marketplace add ricokahler/onshape-cadscript --sparse .agents/plugins
codex plugin add onshape-cadscript@onshape-cadscript
```

Start a new Codex task after installation. Skill metadata allows normal requests such as "make a wall-mount bracket" to discover the workflow without an explicit skill name.

No plugin lifecycle hook installs the native bridge. Bridge installation is always an explicit command.
