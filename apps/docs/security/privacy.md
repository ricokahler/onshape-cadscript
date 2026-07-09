# Privacy

Onshape CadScript does not operate a hosted service and does not collect telemetry, credentials, CAD files, document names, or model geometry.

CAD data passes locally between Codex, the CadScript process, the native host, Chrome, and Onshape. Onshape receives the same API requests and remains governed by your Onshape account and Onshape's policies. Codex and npm usage remain governed by their respective products.

Local files include source models, plans, ownership state, previews, renders, and exports. The bridge token is stored owner-readable in `~/Library/Application Support/onshape-cadscript/bridge.json`.

Removing the extension and running `cadscript bridge uninstall` removes the browser/native-host integration. Delete the application-support directory separately to remove its token and configuration.
