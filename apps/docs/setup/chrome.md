# Chrome Bridge

CadScript uses the Onshape session already signed in to Chrome. It does not ask for a password or API key.

## Prepare The Local Extension

Run:

```sh
npx -y onshape-cadscript@0.1.6 setup chrome
```

CadScript copies the bundled Manifest V3 extension to:

```text
~/Library/Application Support/onshape-cadscript/chrome-extension
```

It also registers the native messaging host for the extension's stable ID and opens both the directory and `chrome://extensions`.

1. Enable **Developer mode** in Chrome.
2. Click **Load unpacked**.
3. Select the prepared `chrome-extension` directory.
4. Open an Onshape document and sign in normally.
5. Run `cadscript doctor --json`.

Loading the unpacked directory is the only manual installation step. The extension ID is fixed by its public manifest key, so users do not copy IDs and native-host permissions do not drift between versions.

## Updating

Chrome does not automatically update unpacked extensions. After updating the npm package:

1. Run `npx -y onshape-cadscript@latest setup chrome` again.
2. Open `chrome://extensions`.
3. Click **Reload** on Onshape CadScript Bridge.
4. Run `cadscript doctor --json`.

For custom extension builds, `cadscript bridge install --extension-id <id>` remains available as an explicit development override.

## Uninstalling

Remove the extension card in `chrome://extensions`, then run:

```sh
cadscript uninstall
```

That removes the PM2 daemon, its Codex daemon entry, native-host manifests, prepared extension files, and owner-only bridge configuration. It never removes CAD project folders or Onshape documents.

## Boundaries

The bridge binds to localhost, requires an owner-only random token, validates a protocol version, limits payloads, and allows only selected Onshape REST paths with GET, POST, and DELETE. It does not provide arbitrary browser evaluation.
