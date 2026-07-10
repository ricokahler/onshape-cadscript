# Troubleshooting

## `cadscript doctor` cannot connect

- Confirm the unpacked extension is enabled.
- Open a signed-in `cad.onshape.com` document tab.
- Re-run `cadscript setup chrome` after changing package versions.
- Click **Reload** on the extension card in `chrome://extensions`.
- Restart Chrome if it still does not reconnect to the native host.
- Check that another process is not using localhost port `27183`.

## Plan says the Part Studio is not empty

Use a dedicated empty Part Studio. `--adopt` is only for a studio whose every feature is already labeled as owned by the same CadScript model.

## Apply says the plan is stale

Something changed the workspace after planning. Run `cadscript plan` again and use the new exact plan ID.

## PM2 daemon is not healthy

- Run `cadscript daemon status --json` and `cadscript daemon logs --lines 100`.
- Confirm port `27184` is free and the configured endpoint is loopback-only.
- Re-run `cadscript daemon install --codex` after a CadScript upgrade.
- Run `cadscript daemon uninstall --codex` to return to the plugin's default stdio server.

## Sketch has warnings

Warnings are failures. Inspect the local preview, duplicate IDs, zero-length lines, disconnected regions, overconstraints, and imported SVG geometry.

## Render is blank

Observe the feature tree first. Confirm there is at least one solid body, the requested view is valid, and all features regenerate cleanly.
