# Onshape CadScript

![Onshape CadScript demo](./assets/demo.gif)

Write one typed TypeScript model, let Codex iterate on it with you, and deploy it into a dedicated Onshape Part Studio through your existing signed-in Chrome session.

<!-- coverage:start -->

[![Stable coverage](https://img.shields.io/badge/stable-22-19A974)](./COVERAGE.md) [![Experimental coverage](https://img.shields.io/badge/experimental-27-D97706)](./COVERAGE.md) [![Roadmap](https://img.shields.io/badge/planned-8-627D98)](./ROADMAP.md)
<!-- coverage:end -->

> **Unofficial community project.** Onshape CadScript is not affiliated with, endorsed by, or supported by Onshape or PTC.

```ts
export default defineModel({
  name: "my-print",
  units: "mm",
  parameters: { depth: lengthParam(8) },
  async *build(cad, p) {
    const profile = yield* cad.sketch({
      id: "profile",
      plane: cad.top,
      entities: [sketch.roundedRectangle("outline", [-20, -12], [20, 12], length(3))],
    });
    yield* cad.extrude({ id: "body", profile, depth: p.depth });
  },
});
```

## Start With Codex

Paste this into Codex:

> Install and configure Onshape CadScript from github.com/ricokahler/onshape-cadscript, connect it to my Onshape browser session, and create a new printable CAD project.

Or install the plugin directly:

```sh
codex plugin marketplace add ricokahler/onshape-cadscript --sparse .agents/plugins
codex plugin add onshape-cadscript@onshape-cadscript
```

The convenience installer runs those same supported Codex commands and verifies the result:

```sh
npx -y onshape-cadscript@0.1.4 setup codex
```

Then start a new Codex task and ask for a CAD model. The bundled skill guides Codex through inspect, edit, preview, plan, exact apply, render, measure, no-op verification, and STL export.

## Browser Setup

CadScript does not receive your Onshape password or an API key. A narrow Chrome extension performs allowlisted Onshape API requests using the browser session you already control, while a token-protected native host carries messages locally.

Prepare the extension and native host:

```sh
npx -y onshape-cadscript@0.1.4 setup chrome
```

The command opens Chrome's Extensions page and reveals the prepared extension directory. Enable Developer Mode, click **Load unpacked**, and select that directory. Then open Onshape, sign in normally, and run `cadscript doctor --json`.

The manifest carries a stable development identity, so native messaging keeps working across package updates. Chrome does not automatically update unpacked extensions; rerun `setup chrome` after upgrading CadScript and click **Reload** on the extension card. See the [local Chrome setup guide](https://ricokahler.github.io/onshape-cadscript/setup/chrome.html).

The v0.1 bridge supports macOS 13+ with Google Chrome and Node.js 22.14+. Other desktop/browser combinations are tracked in the [roadmap](./ROADMAP.md).

## Optional PM2 Daemon

The Codex plugin uses stdio by default, so no background service is required. For a persistent loopback MCP endpoint, install the optional PM2 daemon and register it with Codex:

```sh
npx -y onshape-cadscript@0.1.4 daemon install --codex
cadscript daemon status --json
```

The endpoint is `http://127.0.0.1:27184/mcp`. PM2 manages only the MCP process; Chrome still launches the narrow native host when Onshape access is needed. Remove the daemon and its Codex entry with `cadscript daemon uninstall --codex`, or remove all local CadScript integration files with `cadscript uninstall`. See the [daemon guide](https://ricokahler.github.io/onshape-cadscript/setup/daemon.html).

## Why This Shape

- **One model file.** The async generator and `yield*` DSL reads like a build log and returns symbolic references for later features.
- **One sketch AST.** Onshape compilation, SVG/PNG preview, and SVG import share the same geometry model.
- **Read-only plans.** Apply requires the exact content-addressed plan ID and refuses stale Onshape microversions.
- **Small blast radius.** One model owns one dedicated Part Studio; structural edits replace only the changed suffix.
- **Verification is part of apply.** Errors and warnings fail, then CadScript rereads, renders, measures, and requires a no-op next plan.

## Examples

- [Tolerance coupon](./examples/tolerance-coupon): tune sliding and pocket fit before a full print.
- [Revolved knob](./examples/revolved-knob): profile sketch, symbolic axis query, revolve, and fillet.
- [SVG keychain](./examples/svg-keychain): import vector art into the shared sketch AST.

Read the [documentation](https://ricokahler.github.io/onshape-cadscript/), [coverage catalog](./COVERAGE.md), [roadmap](./ROADMAP.md), [security policy](./SECURITY.md), and [contributing guide](./CONTRIBUTING.md).

MIT licensed.
