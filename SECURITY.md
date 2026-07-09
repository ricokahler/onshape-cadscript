# Security Policy

## Reporting

Please report vulnerabilities privately through GitHub Security Advisories for `ricokahler/onshape-cadscript`. Do not include Onshape cookies, document contents, private model files, or access tokens in an issue.

## Trust Model

CadScript is local-first. Model source, plans, and bridge traffic remain on the user's machine except for requests sent directly to Onshape. The Chrome extension uses the user's existing Onshape session and never reads or stores a password.

The native bridge binds only to `127.0.0.1`, requires a random owner-only token, negotiates a protocol version, bounds payloads, and allows only a narrow set of Onshape API paths and HTTP methods. The extension contains no arbitrary page evaluator. A fixed selection adapter is the only page-internal integration.

## Supported Versions

Security fixes are provided for the latest minor release until v1.0. After v1.0, the latest two minor release lines will receive security fixes.
