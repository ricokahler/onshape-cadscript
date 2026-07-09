# Local Extension Distribution

Onshape CadScript Bridge is intentionally distributed as an unpacked local extension. This keeps the complete CAD data path on the user's computer and makes Chrome Web Store approval unnecessary.

Run:

```sh
npx -y onshape-cadscript setup chrome
```

The command copies these extension files to a stable application-support directory, registers the native messaging host, opens `chrome://extensions`, and reveals the directory to select with **Load unpacked**.

The public `key` in `manifest.json` fixes the development extension ID at `bphhdaecfhpcdolonkggihamebhbglbj`. It is an identity value, not a credential. The native-host manifest allowlists that exact origin.

The extension does not ask for or store an Onshape password or API key. It has no arbitrary page evaluator; its only page-internal behavior is a fixed adapter that reads the user's current Onshape selection.

Chrome does not automatically update unpacked extensions. Rerun `setup chrome` after package upgrades and click **Reload** on the extension card.
