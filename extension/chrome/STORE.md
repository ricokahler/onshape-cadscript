# Chrome Web Store Listing

## Name

Onshape CadScript Bridge

## Summary

Connect local CadScript tools to the Onshape session already signed in to Chrome.

## Description

Onshape CadScript Bridge is the browser half of the open-source Onshape CadScript workflow. It lets a local CadScript CLI or Codex MCP server make narrowly allowlisted Onshape REST requests through the browser session the user already controls.

The extension does not ask for or store an Onshape password or API key. It communicates only with an explicitly installed native messaging host on the same computer. The native host binds to localhost, requires an owner-only random token, limits payload size, validates protocol versions, and supports cancellation and timeouts.

The extension has no arbitrary page evaluator. Its only page-internal behavior is a fixed adapter that reads the user's current Onshape selection.

## Category

Developer Tools

## Language

English

## Privacy

- Single purpose: connect local CadScript tooling to Onshape.
- Host permission: `https://cad.onshape.com/*`.
- Permissions: native messaging and tabs, used to select an open Onshape tab and contact the local host.
- No analytics, advertising, sale of data, or remote CadScript service.
- Privacy policy: https://ricokahler.github.io/onshape-cadscript/security/privacy.html

## Review Notes

The reviewer can load the public GitHub repository, install the matching native host with `npx onshape-cadscript bridge install --extension-id <id>`, open a signed-in Onshape document, and run `cadscript doctor --json`. The extension badge reads `ON` when the native host is connected.
