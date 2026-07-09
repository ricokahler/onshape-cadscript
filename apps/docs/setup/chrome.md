# Chrome Bridge

CadScript uses the Onshape session already signed in to Chrome. It does not ask for a password or API key.

## Chrome Web Store

The public listing link will appear here after Chrome Web Store review. Chrome requires store distribution for normal public installation; see [Chrome's distribution guidance](https://developer.chrome.com/docs/extensions/how-to/distribute). Until review completes:

1. Download the extension ZIP from the GitHub release.
2. Unzip it.
3. Open `chrome://extensions`.
4. Enable Developer mode and choose **Load unpacked**.
5. Select `extension/chrome` and copy the extension ID.

Register the native host:

```sh
cadscript bridge install --extension-id <extension-id>
cadscript doctor --json
```

Open an Onshape document in Chrome before running the health check.

## Boundaries

The bridge binds to localhost, requires an owner-only random token, validates a protocol version, limits payloads, and allows only selected Onshape REST paths with GET, POST, and DELETE. It does not provide arbitrary browser evaluation.
