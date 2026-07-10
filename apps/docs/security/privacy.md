# Privacy

Onshape CadScript does not operate a hosted service and does not collect telemetry, credentials, CAD files, document names, or model geometry.

CAD data passes locally between Codex, the CadScript process, the native host, Chrome, and Onshape. Onshape receives the same API requests and remains governed by your Onshape account and Onshape's policies. Codex and npm usage remain governed by their respective products.

Local files include source models, plans, ownership state, previews, renders, and exports. The bridge token is stored owner-readable in `~/Library/Application Support/onshape-cadscript/bridge.json`.

Removing the Chrome extension card and running `cadscript uninstall` removes the browser/native-host integration, optional PM2 daemon, Codex daemon entry, prepared extension files, token, and configuration. It does not remove CAD project folders or Onshape documents. Use `cadscript bridge uninstall` when you only want to remove native-host registration.
