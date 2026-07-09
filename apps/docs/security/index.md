# Security

CadScript is local-first. Model files, plans, bridge tokens, and CAD responses are not sent to a CadScript service. Requests go from the local tool to Chrome and directly to Onshape.

See the repository [security policy](https://github.com/ricokahler/onshape-cadscript/security/policy) for vulnerability reporting.

## Important Boundaries

- No Onshape password or API key collection.
- No arbitrary page-context evaluation.
- No unrestricted feature mutation MCP tool.
- No non-local bridge bind.
- No silent native-host installation.
- Exact plan and microversion checks before mutation.
- Version checkpoint before feature deletion.
