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
import { execFileSync } from "node:child_process";
import { readFileSafe, listMarkdownShallow, isFolderNote } from "../../core/fs.ts";
import { listRawFiles, MANIFEST_RELATIVE } from "../../core/manifest.ts";
import { resolveVault } from "../../core/vault.ts";
import { globToRegExp } from "../../core/firewall.ts";

/** Per-wired-source change count since its last sync point. */
export interface WiredChange {
  readonly name: string;
  readonly changed: number;
}

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
  /**
   * Changed docs per wired source (git diff vs lastSyncedCommit, filtered by
   * the record's include/exclude globs); null when no wired sources are
   * registered. Informational only — sync is manual, so wired changes never
   * flip `needsCatchup`.
   */
  readonly wiredChanges: readonly WiredChange[] | null;
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

interface WiredSourceRecord {
  readonly name: string;
  readonly path: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly lastSyncedCommit: string;
}

/** Parse wired_sources from settings.json; null when absent or malformed. */
function readWiredSources(cwd: string): readonly WiredSourceRecord[] | null {
  const settingsPath =
    process.env["CLAUDE_WIKI_PAGES_SETTINGS_FILE"] ??
    join(cwd, ".claude", "claude-wiki-pages", "settings.json");
  const raw = readFileSafe(settingsPath);
  if (raw === null) return null;
  try {
    const data = JSON.parse(raw) as { wired_sources?: unknown };
    if (!Array.isArray(data.wired_sources) || data.wired_sources.length === 0) return null;
    const records: WiredSourceRecord[] = [];
    for (const w of data.wired_sources as Record<string, unknown>[]) {
      if (typeof w["name"] !== "string" || typeof w["path"] !== "string") return null;
      records.push({
        name: w["name"],
        path: w["path"],
        include: Array.isArray(w["include"]) ? (w["include"] as string[]) : [],
        exclude: Array.isArray(w["exclude"]) ? (w["exclude"] as string[]) : [],
        lastSyncedCommit: typeof w["lastSyncedCommit"] === "string" ? w["lastSyncedCommit"] : "",
      });
    }
    return records;
  } catch {
    return null;
  }
}

/** Changed files in a wired repo since its sync point (empty on any git failure). */
function gitChangedFiles(repo: string, lastCommit: string): readonly string[] {
  try {
    const args = lastCommit === "" ? ["ls-files"] : ["diff", "--name-only", `${lastCommit}..HEAD`];
    // M29: carry the same GIT_TIMEOUT_MS backstop used by git.ts so a held
    // index.lock or slow repo never blocks heartbeat.sh / SessionStart.
    const gitTimeoutMs: number = (() => {
      const v = Number(process.env["CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS"] ?? "");
      return Number.isFinite(v) && v > 0 ? v : 30_000;
    })();
    const out = execFileSync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: gitTimeoutMs,
    });
    return out.split("\n").filter((l) => l.length > 0);
  } catch {
    return [];
  }
}

/** Count a wired source's changed docs after include/exclude glob filtering. */
function countWiredChanges(rec: WiredSourceRecord): number {
  const include = rec.include.map(globToRegExp);
  const exclude = rec.exclude.map(globToRegExp);
  return gitChangedFiles(rec.path, rec.lastSyncedCommit).filter(
    (f) => include.some((re) => re.test(f)) && !exclude.some((re) => re.test(f)),
  ).length;
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
        .filter((p) => {
          const s = basename(p, ".md");
          return s !== "manifest" && s !== "_index" && !isFolderNote(p);
        })
        .map((p) => basename(p, ".md")),
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

  // Wired-source changes are informational: sync is manual by design, so they
  // are surfaced (heartbeat SYNC: line) but never flip needsCatchup.
  const wiredRecords = readWiredSources(opts.cwd ?? process.cwd());
  const wiredChanges =
    wiredRecords === null
      ? null
      : wiredRecords.map((rec) => ({ name: rec.name, changed: countWiredChanges(rec) }));

  return {
    command: "backlog",
    vault,
    pendingRaw,
    lastIngest,
    lastLint,
    daysSinceLint,
    needsCatchup,
    wiredChanges,
  };
}
