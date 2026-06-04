/**
 * `backlog` — the deterministic "what maintenance is outstanding?" probe.
 *
 * Reports unprocessed raw sources and how long since the last lint, so the
 * heartbeat (`scripts/heartbeat.sh`) and the maintenance agent can decide
 * whether to run the loop. It reuses the orchestrator's `raw_pending`
 * definition (a raw file is pending when its name does not appear in
 * `wiki/log.md` ingest entries) and prefers the schema-v2 source manifest when
 * present, so detection is O(rows) instead of re-deriving from the log.
 */

import { basename, extname, join } from "node:path";
import { readFileSafe, listMarkdownShallow } from "../../core/fs.ts";
import { listRawFiles, MANIFEST_RELATIVE } from "../../core/manifest.ts";
import { resolveVault } from "../../core/vault.ts";

export interface BacklogReport {
  readonly command: "backlog";
  readonly vault: string;
  /** Raw sources not yet ingested (vault-relative paths). */
  readonly pendingRaw: readonly string[];
  readonly lastIngest: string | null;
  readonly lastLint: string | null;
  /** Whole days between `today` and the last lint; null when never linted. */
  readonly daysSinceLint: number | null;
  readonly needsCatchup: boolean;
}

export interface BacklogOptions {
  readonly target?: string;
  readonly cwd?: string;
  /** Lint-staleness threshold (days). Defaults to 7. */
  readonly lintEveryDays?: number;
  /** Injectable for deterministic tests; default derived from the wall clock. */
  readonly today?: string;
}

const DAY_MS = 86_400_000;

/** Most recent `## [YYYY-MM-DD] <verb>` date for a given verb, or null. */
function lastEntryDate(log: string, verb: string): string | null {
  const re = new RegExp(`^##\\s*\\[(\\d{4}-\\d{2}-\\d{2})\\]\\s*${verb}\\b`, "gm");
  let last: string | null = null;
  for (const m of log.matchAll(re)) last = m[1] ?? last;
  return last;
}

/** Pending raw files from the manifest table (status = pending), if it exists. */
function pendingFromManifest(manifest: string): string[] | null {
  const rows = manifest
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && l.includes("|"))
    .map((l) => l.split("|").map((c) => c.trim()))
    .filter(
      (cells) => cells.length >= 4 && cells[1] && cells[1] !== "raw_file" && cells[1] !== "---",
    );
  if (rows.length === 0) return null;
  return rows.filter((c) => c[2] === "pending").map((c) => c[1] as string);
}

export function backlog(opts: BacklogOptions = {}): BacklogReport {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const lintEveryDays = opts.lintEveryDays ?? 7;

  const log = readFileSafe(join(vault, "wiki", "log.md")) ?? "";
  const lastIngest = lastEntryDate(log, "ingest");
  const lastLint = lastEntryDate(log, "lint");

  // Prefer the manifest; fall back to the log-scan definition of "pending".
  const manifest = readFileSafe(join(vault, MANIFEST_RELATIVE));
  let pendingRaw: string[];
  const fromManifest = manifest ? pendingFromManifest(manifest) : null;
  if (fromManifest) {
    pendingRaw = fromManifest;
  } else {
    // Fallback: a raw file is processed when a source summary with the same stem
    // exists under wiki/_sources/ (the same rule the manifest generator uses).
    const sourceStems = new Set(
      listMarkdownShallow(join(vault, "wiki", "_sources"))
        .map((p) => basename(p, ".md"))
        .filter((s) => s !== "manifest" && s !== "_index"),
    );
    pendingRaw = listRawFiles(join(vault, "raw"))
      .filter((full) => !sourceStems.has(basename(full, extname(full))))
      .map((full) => full.slice(vault.length + 1));
  }

  const daysSinceLint =
    lastLint !== null
      ? Math.max(0, Math.round((Date.parse(today) - Date.parse(lastLint)) / DAY_MS))
      : null;

  const lintStale = daysSinceLint !== null && daysSinceLint >= lintEveryDays;
  const neverLinted = lastLint === null && (pendingRaw.length > 0 || lastIngest !== null);
  const needsCatchup = pendingRaw.length > 0 || lintStale || neverLinted;

  return {
    command: "backlog",
    vault,
    pendingRaw,
    lastIngest,
    lastLint,
    daysSinceLint,
    needsCatchup,
  };
}
