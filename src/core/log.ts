/**
 * Append-only operations log helper for `wiki/log.md`.
 *
 * The log is the human-readable chronological record of every wiki operation
 * (`## [YYYY-MM-DD] <verb> | <summary>`), defined by the schema in
 * `vault/CLAUDE.md`. Until now only agents/skills appended to it; this helper
 * lets the engine record its own git-bounded operations (`heal`, `migrate`,
 * later `propose`/`checkpoint`) so structural changes leave a trace too.
 *
 * Idempotent within a day: an identical header is not appended twice, so a
 * re-run in the same session does not duplicate the entry.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readFileSafe, existsSync } from "./fs.ts";

export interface LogEntry {
  /** The operation verb, e.g. "heal", "migrate". */
  readonly verb: string;
  /** One-line summary after the `|`. */
  readonly summary: string;
  /** Optional bullet lines under the entry (e.g. a rollback hint). */
  readonly details?: readonly string[];
  /** ISO date stamp; defaults to today. Injectable for deterministic tests. */
  readonly today?: string;
}

const LOG_STUB = `---
title: "Operations Log"
type: log
aliases: ["Operations Log"]
created: __DATE__
updated: __DATE__
---

# Operations Log

Chronological record of every wiki operation.
`;

/**
 * Append an entry to `<vault>/wiki/log.md`, creating the file if absent.
 * Returns true when the file was written, false when the entry already existed
 * (idempotent) or the vault has no `wiki/` directory.
 */
export function appendLog(vault: string, entry: LogEntry): boolean {
  const wiki = join(vault, "wiki");
  if (!existsSync(wiki)) return false;

  const today = entry.today ?? new Date().toISOString().slice(0, 10);
  const header = `## [${today}] ${entry.verb} | ${entry.summary}`;
  const logPath = join(wiki, "log.md");

  const existing = readFileSafe(logPath) ?? LOG_STUB.replaceAll("__DATE__", today);
  if (existing.includes(header)) return false; // already recorded — idempotent

  const block = [
    "",
    header,
    "",
    ...(entry.details ?? []).map((d) => `- ${d}`),
    ...(entry.details && entry.details.length > 0 ? [""] : []),
  ].join("\n");

  const next = existing.replace(/\s*$/, "\n") + block.replace(/^\n/, "") + "\n";
  try {
    writeFileSync(logPath, next.replace(/\n{3,}/g, "\n\n"));
  } catch {
    // The log is a best-effort trace, not load-bearing data. A write failure
    // (e.g. EACCES on a read-only wiki/) must not abort the operation that was
    // being logged — report "did not write" consistent with the boolean contract.
    return false;
  }
  return true;
}
