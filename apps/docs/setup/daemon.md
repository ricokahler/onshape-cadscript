# PM2 Daemon

The Codex plugin launches CadScript over stdio by default. That mode is automatic and does not leave a background process running.

Use the optional daemon when you want one persistent, reusable MCP endpoint:

```sh
npx -y onshape-cadscript@0.1.5 daemon install --codex
```

CadScript starts a version-pinned launcher with PM2, waits for `/healthz`, saves PM2 state, and registers `http://127.0.0.1:27184/mcp` as `onshape-cadscript-daemon` in Codex. The service is loopback-only and uses MCP Streamable HTTP.

## Lifecycle

```sh
cadscript daemon status --json
cadscript daemon logs --lines 100
cadscript daemon uninstall --codex
```

Run `pm2 startup` once if you want PM2 to restore its saved process list after login or reboot. PM2 may print a platform-specific command that requires your approval.

`cadscript daemon uninstall --codex` removes the PM2 process, saved launcher metadata, and optional Codex endpoint. `cadscript uninstall` additionally removes the native host, prepared extension files, and bridge token. Chrome extensions must be removed from `chrome://extensions` because browsers do not allow a local CLI to silently uninstall them.

## Architecture Boundary

PM2 manages the MCP server, not the Chrome native messaging host. Chrome launches the native host on demand and owns its stdin/stdout channel. Keeping those lifecycles separate preserves Chrome's origin checks and avoids a general-purpose browser daemon.
