/**
 * markdown-link-check — detect `[text](file.md)` markdown links in wiki pages.
 *
 * Ports the CLI half of `scripts/check-wikilinks.sh check_content()`.
 *
 * The hook half of `check-wikilinks.sh` (PreToolUse stdin-JSON path) stays in
 * bash until Phase 3 (tmp/migration-plan.md §Phase 3).
 *
 * Detection rules (mirroring the bash `check_content` function):
 *   - Frontmatter (`---` block) is stripped before scanning.
 *   - Fenced code blocks (triple-backtick) are stripped to avoid false positives
 *     on examples.
 *   - The pattern `\[.+\]\([^)]+\.md\)` flags a markdown-link violation.
 *   - Bookkeeping files (`index`, `log`, `dashboard`, `manifest`, `_index`,
 *     `.gitkeep`) and folder notes (`<dir>/<dir>.md` + `type: index`) are skipped.
 *
 * Returns a `Finding[]` — never throws. An empty array means clean.
 * Consumed by `lint --check md-links` via `src/commands/lint/lint.ts`.
 */

import { join, relative } from "node:path";
import type { Finding } from "./report.ts";
import { listMarkdownRecursive, isBookkeepingFile } from "./fs.ts";
import { markdownLinkViolation } from "./wikilinks.ts";
import { readFileSafe } from "./fs.ts";

/**
 * The check name emitted on every finding produced by this module.
 * Used as the `check` field in `Finding` and as the `--check` selector in lint.
 */
export const MD_LINKS_CHECK = "md-links" as const;

/**
 * Scan `vault/wiki/` for pages that use `[text](file.md)` links instead of
 * `[[wikilinks]]`. Returns an error-severity finding per violating file.
 *
 * Skips bookkeeping files (`index.md`, `log.md`, …) and folder notes
 * (`<topic>/<topic>.md` with `type: index`). The `file` field on each finding
 * is the vault-relative path (e.g. `wiki/concepts/page.md`) for traceability.
 *
 * @param vault - absolute path to the vault root (the directory containing `wiki/`).
 */
export function checkMarkdownLinks(vault: string): Finding[] {
  const wiki = join(vault, "wiki");
  const findings: Finding[] = [];

  for (const absPath of listMarkdownRecursive(wiki)) {
    // Skip bookkeeping files (index, log, dashboard, manifest, _index,
    // .gitkeep) and folder notes (stem == parent dir name + type: index).
    if (isBookkeepingFile(absPath)) continue;

    const content = readFileSafe(absPath);
    if (content === null) continue;

    const msg = markdownLinkViolation(content);
    if (msg === null) continue;

    // Build the vault-relative path (e.g. wiki/concepts/bad-page.md) so
    // agents and humans can locate the file without guessing the vault root.
    const rel = relative(vault, absPath).split(/[\\/]/).join("/");

    findings.push({
      severity: "error",
      check: MD_LINKS_CHECK,
      message: buildMessage(content),
      file: rel,
    });
  }

  // Findings are already sorted because listMarkdownRecursive returns a sorted
  // list (fs.ts:58–71), so the loop produces deterministic order.
  return findings;
}

/**
 * Build a human-readable finding message that includes the first offending
 * fragment — mirrors the U4 "errors-that-teach" principle in the bash script:
 *
 *   "Wiki file uses [text](file.md) links (e.g. <fragment>). Convert to …"
 *
 * Extracts the first `[text](*.md)` fragment from the stripped body so the
 * author can locate the line without a separate grep (same as the bash script's
 * `grep -oE '\[.+\]\([^)]+\.md\)' | head -1` approach).
 */
function buildMessage(content: string): string {
  const fragment = firstMarkdownLinkFragment(content);
  const example = fragment !== null ? ` (e.g. ${fragment})` : "";
  return `Wiki file uses [text](file.md) links${example}. Convert to [[Page Title]] wikilinks for Obsidian compatibility.`;
}

/**
 * Extract the first `[text](*.md)` fragment from `content`, excluding
 * frontmatter and fenced code blocks. Returns null when no fragment is found.
 *
 * Reuses the same stripping logic as `markdownLinkViolation` in wikilinks.ts
 * to stay byte-aligned with the bash twin's `check_content()`.
 */
function firstMarkdownLinkFragment(content: string): string | null {
  // Strip frontmatter
  const lines = content.split("\n");
  let bodyStart = 0;
  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === "---") {
        bodyStart = i + 1;
        break;
      }
    }
  }
  const bodyLines = lines.slice(bodyStart);

  // Strip fenced code blocks (mirrors `sed '/^```/,/^```/d'`)
  const stripped: string[] = [];
  let inFence = false;
  for (const line of bodyLines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) stripped.push(line);
  }

  const body = stripped.join("\n");
  const match = /\[.+?\]\([^)]+\.md\)/.exec(body);
  return match !== null ? (match[0] ?? null) : null;
}
