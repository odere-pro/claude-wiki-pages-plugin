#!/usr/bin/env bun
/**
 * json-tool.ts — tiny stdin/argv JSON utility for the bash hook layer.
 *
 * Bun is already the engine runtime and is faster to start than python3, so the
 * hooks call this instead of an inline `python3 -c` for JSON-correct parsing.
 * Replacing python3 here removes a whole hard dependency: the plugin now needs
 * only one non-shell runtime (Bun) instead of two (python3 + Bun).
 *
 * Graceful degradation is unchanged: callers wrap the invocation in
 * `2>/dev/null || true`, so a missing Bun (command-not-found) yields empty
 * output and the hook no-ops, exactly as the python version did.
 *
 * Subcommands:
 *   field <path...>     Read JSON from stdin; print the first dotted path whose
 *                       value is a non-empty string. Mirrors python's
 *                       `d.get('a',{}).get('b') or d.get('c') or ''`.
 *                       Paths use dot notation, e.g. tool_input.file_path.
 *   realpath <path>     Print the canonical absolute path, resolving symlinks on
 *                       the existing prefix and normalizing the rest. Matches
 *                       python's os.path.realpath (works on non-existent paths).
 */

import { realpathSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";

/** Resolve a value at a dotted path; return "" unless it is a non-empty string. */
function dottedString(obj: unknown, path: string): string {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" ? cur : "";
}

/** os.path.realpath-equivalent: resolve symlinks on the deepest existing prefix. */
function realpathish(input: string): string {
  let p = resolve(input);
  // Walk up to the deepest ancestor that exists, realpath it, re-append the rest.
  const tail: string[] = [];
  // Guard against an unbounded loop at the filesystem root.
  for (let depth = 0; depth < 4096; depth++) {
    try {
      const real = realpathSync(p);
      return tail.length ? resolve(real, ...tail.reverse()) : real;
    } catch {
      const parent = dirname(p);
      if (parent === p) return resolve(input); // reached root, nothing resolvable
      tail.push(basename(p));
      p = parent;
    }
  }
  return resolve(input);
}

async function main(): Promise<number> {
  const [sub, ...rest] = process.argv.slice(2);

  if (sub === "field") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await Bun.stdin.text());
    } catch {
      return 1; // malformed JSON — caller treats empty output as no-op
    }
    for (const path of rest) {
      const val = dottedString(parsed, path);
      if (val !== "") {
        process.stdout.write(val);
        break;
      }
    }
    return 0;
  }

  if (sub === "realpath") {
    if (rest[0] === undefined) return 1;
    process.stdout.write(realpathish(rest[0]));
    return 0;
  }

  process.stderr.write(`json-tool: unknown subcommand '${sub ?? ""}'\n`);
  return 2;
}

process.exit(await main());
