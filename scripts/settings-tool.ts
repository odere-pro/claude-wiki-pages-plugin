#!/usr/bin/env bun
/**
 * settings-tool.ts — the JSON-correct reader/writer for the plugin's
 * settings.json (vault path, multi-vault registry, wired sources).
 *
 * Replaces the inline `python3 - <<PYEOF` heredocs that resolve-vault.sh,
 * lib-vault-registry.sh, and lib-wired-source.sh used to embed. Bun is already
 * the engine runtime, so routing this through Bun removes python3 as a hard
 * dependency without adding a new one — the plugin now needs a single non-shell
 * runtime instead of two.
 *
 * Each subcommand is a faithful translation of one former python heredoc,
 * including its fail-closed exit codes and stderr WARN text. The sourced bash
 * helpers keep their degraded grep/sed/awk fallbacks for the top-level-string
 * reads/writes when Bun itself cannot run (the silent-wrong-vault guard); the
 * nested array/object operations remain Bun-only, exactly as they were
 * python-only, because they require a real JSON parser.
 *
 * Output formatting matches python's json.dumps:
 *   - compact  -> JSON.stringify(x)            (item arrays passed between steps)
 *   - indent=2 -> JSON.stringify(x, null, 2)   (full settings file rewrites)
 * For ASCII string values these are byte-identical to the python output.
 */

import { readFileSync } from "node:fs";

type Json = unknown;

const WARN = (msg: string): void => {
  process.stderr.write(msg);
};

/** Read + parse a JSON file. Throws on read or parse error (caller decides). */
function loadJson(file: string): Json {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Pretty form matching python json.dumps(data, indent=2) + a trailing newline. */
function writePretty(data: Json): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function asObject(v: Json): Record<string, Json> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, Json>)
    : {};
}

function asArray(v: Json): Json[] {
  return Array.isArray(v) ? v : [];
}

// ── resolve-vault.sh: _settings_get_field / set_vault_path ────────────────────

function cmdGet(file: string, field: string): number {
  let data: Json;
  try {
    data = loadJson(file);
  } catch {
    return 1; // parse error — python's only hard-error path here
  }
  const val = asObject(data)[field];
  if (typeof val === "string") process.stdout.write(val);
  return 0;
}

function cmdSet(file: string, field: string, value: string): number {
  let data: Record<string, Json>;
  try {
    data = asObject(loadJson(file));
  } catch {
    data = {};
  }
  data[field] = value;
  writePretty(data);
  return 0;
}

// ── lib-vault-registry.sh ─────────────────────────────────────────────────────

function cmdHasKey(file: string, key: string): number {
  let data: Json;
  try {
    data = loadJson(file);
  } catch {
    return 1; // uncaught in python too — treated as "key absent"
  }
  return key in asObject(data) ? 0 : 1;
}

function cmdVaultsRead(file: string): number {
  let data: Json;
  try {
    data = loadJson(file);
  } catch (exc) {
    WARN(
      `[claude-wiki-pages] WARN: registry malformed (cannot parse ${file}: ${exc})` +
        ` — all writes blocked until repaired\n`,
    );
    return 1;
  }
  const obj = asObject(data);
  if (!("vaults" in obj)) return 0; // valid legacy project; tier-4 fallback applies
  const vaults = asArray(obj.vaults);
  const current = typeof obj.current_vault_path === "string" ? obj.current_vault_path : "";

  if (current && !vaults.some((v) => asObject(v).path === current)) {
    WARN(
      `[claude-wiki-pages] WARN: registry inconsistent` +
        ` (current_vault_path '${current}' is not in vaults[])` +
        ` — all writes blocked until repaired\n`,
    );
    return 1;
  }

  const lines: string[] = [];
  for (const v of vaults) {
    const o = asObject(v);
    const path = o.path ?? "";
    const name = o.name ?? "";
    if (typeof path !== "string" || typeof name !== "string") {
      WARN(
        `[claude-wiki-pages] WARN: registry malformed` +
          ` (non-string name or path in vaults[]: path=${JSON.stringify(path)} name=${JSON.stringify(name)})` +
          ` — all writes blocked until repaired\n`,
      );
      return 1;
    }
    lines.push(`${path}|${name}`);
  }
  if (lines.length) process.stdout.write(lines.join("\n") + "\n");
  return 0;
}

function cmdVaultsGet(file: string): number {
  process.stdout.write(JSON.stringify(asArray(asObject(loadJson(file)).vaults)));
  return 0;
}

function cmdVaultsWrite(file: string, vaultsJson: string): number {
  let data: Record<string, Json>;
  try {
    data = asObject(loadJson(file));
  } catch {
    data = {};
  }
  data.vaults = JSON.parse(vaultsJson);
  writePretty(data);
  return 0;
}

function cmdArrayAppend(arrJson: string, entryJson: string): number {
  const lst = JSON.parse(arrJson) as Json[];
  lst.push(JSON.parse(entryJson));
  process.stdout.write(JSON.stringify(lst));
  return 0;
}

function cmdArrayFilterPath(arrJson: string, path: string): number {
  const lst = (JSON.parse(arrJson) as Json[]).filter((v) => asObject(v).path !== path);
  process.stdout.write(JSON.stringify(lst));
  return 0;
}

// ── lib-wired-source.sh ───────────────────────────────────────────────────────

function cmdWiredRead(file: string): number {
  let data: Json;
  try {
    data = loadJson(file);
  } catch (exc) {
    WARN(
      `[claude-wiki-pages] WARN: settings malformed (cannot parse ${file}: ${exc})` +
        ` — wired sources unavailable\n`,
    );
    return 1;
  }
  const lines: string[] = [];
  for (const w of asArray(asObject(data).wired_sources)) {
    const o = asObject(w);
    const name = o.name ?? "";
    const path = o.path ?? "";
    const vault = o.vault ?? "";
    const commit = o.lastSyncedCommit ?? "";
    const fields = [name, path, vault, commit];
    if (!fields.every((v) => typeof v === "string") || !name) {
      WARN(
        `[claude-wiki-pages] WARN: wired_sources entry malformed (name=${JSON.stringify(name)})` +
          ` — wired sources unavailable\n`,
      );
      return 1;
    }
    if (fields.some((v) => (v as string).includes("|"))) {
      WARN(
        `[claude-wiki-pages] WARN: wired_sources entry ${JSON.stringify(name)} has a '|' in a` +
          ` field (reserved record delimiter) — wired sources unavailable\n`,
      );
      return 1;
    }
    lines.push(`${name}|${path}|${vault}|${commit}`);
  }
  if (lines.length) process.stdout.write(lines.join("\n") + "\n");
  return 0;
}

function cmdWiredGlobs(file: string, name: string, which: string): number {
  const data = loadJson(file);
  for (const w of asArray(asObject(data).wired_sources)) {
    const o = asObject(w);
    if (o.name === name) {
      for (const g of asArray(o[which])) {
        if (typeof g === "string") process.stdout.write(g + "\n");
      }
    }
  }
  return 0;
}

function cmdWiredAdd(
  file: string,
  name: string,
  path: string,
  vault: string,
  includeJson: string,
  excludeJson: string,
): number {
  const data = asObject(loadJson(file));
  const sources = asArray((data.wired_sources ??= []));
  let entry = sources.find((w) => asObject(w).name === name) as Record<string, Json> | undefined;
  if (entry === undefined) {
    entry = { name, lastSyncedCommit: "", lastSyncedAt: "" };
    sources.push(entry);
  }
  Object.assign(entry, {
    path,
    vault,
    include: JSON.parse(includeJson),
    exclude: JSON.parse(excludeJson),
  });
  writePretty(data);
  return 0;
}

function cmdWiredSetSynced(file: string, name: string, commit: string, iso: string): number {
  const data = asObject(loadJson(file));
  for (const w of asArray(data.wired_sources)) {
    const o = asObject(w);
    if (o.name === name) {
      o.lastSyncedCommit = commit;
      o.lastSyncedAt = iso;
    }
  }
  writePretty(data);
  return 0;
}

// ── dispatch ──────────────────────────────────────────────────────────────────

function dispatch(argv: string[]): number {
  const [sub, ...a] = argv;
  switch (sub) {
    case "get":
      return cmdGet(a[0], a[1]);
    case "set":
      return cmdSet(a[0], a[1], a[2]);
    case "has-key":
      return cmdHasKey(a[0], a[1]);
    case "vaults-read":
      return cmdVaultsRead(a[0]);
    case "vaults-get":
      return cmdVaultsGet(a[0]);
    case "vaults-write":
      return cmdVaultsWrite(a[0], a[1]);
    case "array-append":
      return cmdArrayAppend(a[0], a[1]);
    case "array-filter-path":
      return cmdArrayFilterPath(a[0], a[1]);
    case "wired-read":
      return cmdWiredRead(a[0]);
    case "wired-globs":
      return cmdWiredGlobs(a[0], a[1], a[2]);
    case "wired-add":
      return cmdWiredAdd(a[0], a[1], a[2], a[3], a[4], a[5]);
    case "wired-set-synced":
      return cmdWiredSetSynced(a[0], a[1], a[2], a[3]);
    default:
      process.stderr.write(`settings-tool: unknown subcommand '${sub ?? ""}'\n`);
      return 2;
  }
}

try {
  process.exit(dispatch(process.argv.slice(2)));
} catch {
  // Any uncaught error (bad JSON in an argv payload, etc.) is a hard failure,
  // matching the former python heredocs that had no try/except: nonzero exit,
  // empty stdout. Callers test `[ ! -s "$tmp" ]` / the exit code.
  process.exit(1);
}
