#!/bin/bash
# Gate 07 — templates/default.config.json conforms to schemas/config.schema.json
# (structural round-trip: every template key is a declared property, enum values
# are valid, and the default config parses).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi

bun -e '
const schema = await Bun.file("schemas/config.schema.json").json();
const cfg = await Bun.file("templates/default.config.json").json();
const errors = [];
const props = schema.properties ?? {};
for (const k of Object.keys(cfg)) {
  if (k === "$schema") continue;
  if (!(k in props)) errors.push(`unknown key: ${k}`);
}
const check = (obj, spec, path) => {
  for (const [k, v] of Object.entries(obj)) {
    const s = spec?.properties?.[k];
    if (!s) continue;
    if (s.enum && !s.enum.includes(v)) errors.push(`${path}${k}: "${v}" not in enum ${s.enum.join("|")}`);
    if (s.type === "object" && v && typeof v === "object") check(v, s, `${path}${k}.`);
  }
};
check(cfg, schema, "");
if (errors.length) { console.error("FAIL:\n  " + errors.join("\n  ")); process.exit(1); }
console.log("OK: default config conforms to schema");
'
