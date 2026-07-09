#!/usr/bin/env python3
import json
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[1]
plugin = root / "plugins" / "onshape-cadscript"
manifest = json.loads((plugin / ".codex-plugin" / "plugin.json").read_text())
errors = []

if manifest.get("name") != plugin.name:
    errors.append("plugin folder and manifest name must match")
if not re.fullmatch(r"\d+\.\d+\.\d+", manifest.get("version", "")):
    errors.append("plugin version must be strict semver")
if not manifest.get("description") or not manifest.get("author", {}).get("name"):
    errors.append("description and author.name are required")
for field in ("homepage", "repository"):
    if not str(manifest.get(field, "")).startswith("https://"):
        errors.append(f"{field} must be an https URL")

interface = manifest.get("interface", {})
for field in ("displayName", "shortDescription", "longDescription", "developerName", "category"):
    if not interface.get(field):
        errors.append(f"interface.{field} is required")
for field in ("composerIcon", "logo", "logoDark"):
    value = interface.get(field)
    if value and not (plugin / value).exists():
        errors.append(f"missing {field}: {value}")
for value in interface.get("screenshots", []):
    if not value.endswith(".png") or not (plugin / value).exists():
        errors.append(f"invalid screenshot: {value}")
for relative in (manifest.get("skills"), manifest.get("mcpServers")):
    if relative and not (plugin / relative).exists():
        errors.append(f"missing plugin component: {relative}")
for path in plugin.rglob("*"):
    if path.is_file() and path.suffix in {".md", ".json", ".yaml", ".yml"} and "[TODO:" in path.read_text(errors="ignore"):
        errors.append(f"placeholder remains in {path.relative_to(plugin)}")

if errors:
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    sys.exit(1)
print(f"Validated plugin: {plugin}")
