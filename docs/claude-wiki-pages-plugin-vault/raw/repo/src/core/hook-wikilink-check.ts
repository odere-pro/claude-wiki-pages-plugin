/**
 * hook-wikilink-check — the HOOK half of `scripts/check-wikilinks.sh`.
 *
 * This is the PreToolUse `Write|Edit` slice (the stdin-JSON path, bash lines
 * 50–143), ported as a pure function over a *single changed file's* content.
 * It is deliberately distinct from the CLI half in
 * [`markdown-link-check.ts`](./markdown-link-check.ts): that module scans a whole
 * `wiki/` directory and is consumed by `lint --check md-links`; this module sees
 * exactly what one Write/Edit tool call carries — one path + one body — and
 * returns the broken/missing-wikilink `Finding[]` the hook would block on.
 *
 * Wiring (the hook reading stdin JSON, emitting `{"decision":"block",…}`, and
 * the Bun-absent fail-closed path) belongs to Phase 3 of tmp/migration-plan.md
 * and is NOT in this module — a serial integrator adds it afterward. This file
 * is the pure decision core only.
 *
 * Rules enforced (mirroring the bash `check_content()` + the Edit `new_string`
 * scan, scripts/check-wikilinks.sh:96–142):
 *   - Only files under `<vault-name>/wiki/` are in scope (bash `case` at :116).
 *   - Frontmatter (`--- … ---`) and fenced code blocks (```) are stripped before
 *     scanning, so examples and YAML metadata never trip the rule.
 *   - A `[text](file.md)` markdown link in the changed body is a broken-wikilink
 *     violation: Obsidian needs `[[Page Title]]` wikilinks, not file links.
 *
 * Returns a `Finding[]` — never throws. An empty array means the change is
 * allowed. The `check` field is `md-links` so it aggregates with the CLI half
 * under one selector.
 *
 * Reuses [`wikilinks.ts`](./wikilinks.ts) (`markdownLinkViolation` for the
 * decision) and [`frontmatter.ts`](./frontmatter.ts) (`splitFrontmatter` for the
 * fragment extraction); the resolver in
 * [`link-resolver.ts`](./link-resolver.ts) is the shared resolution authority a
 * future missing-target rule would consume, but the bash hook half enforces only
 * the markdown-link rule today, so no resolver pass is performed on a single
 * uncommitted body (it cannot see the rest of the vault).
 */

import type { Finding } from "./report.ts";
import { markdownLinkViolation } from "./wikilinks.ts";
import { splitFrontmatter } from "./frontmatter.ts";

/**
 * The check name on every finding from this module. Shared with the CLI half
 * (`markdown-link-check.ts`) so both halves aggregate under `lint --check
 * md-links` and a single severity story.
 */
export const HOOK_WIKILINK_CHECK = "md-links" as const;

/** One changed file as a PreToolUse hook sees it (one path + one body). */
export interface ChangedFile {
  /**
   * Absolute path of the file being written/edited
   * (`tool_input.file_path` / `tool_input.file`).
   */
  readonly filePath: string;
  /** Basename of the resolved active vault (the `<vault-name>` path segment). */
  readonly vaultName: string;
  /**
   * The content under inspection: the full Write `content`, or the Edit
   * `new_string` fragment. Frontmatter/fences are stripped internally.
   */
  readonly content: string;
}

/**
 * True iff `filePath` lives under `<vaultName>/wiki/` — the exact scope of the
 * bash hook's "case ... in .../<vaultName>/wiki/*" guard
 * (scripts/check-wikilinks.sh:116). Path comparison uses `/` separators; the
 * caller passes the tool-call path as-is.
 */
export function isWikiFilePath(filePath: string, vaultName: string): boolean {
  if (filePath === "" || vaultName === "") return false;
  const normalized = filePath.split(/[\\/]/).join("/");
  return normalized.includes(`/${vaultName}/wiki/`);
}

/**
 * Evaluate the broken/missing-wikilink rules over one changed file.
 *
 * Returns an error-severity finding when an in-scope (wiki/) change introduces a
 * `[text](file.md)` markdown link, else `[]`. Out-of-scope paths and clean
 * bodies return `[]`. Never throws — malformed content yields `[]`.
 */
export function checkChangedWikilinks(change: ChangedFile): Finding[] {
  if (!isWikiFilePath(change.filePath, change.vaultName)) return [];
  if (change.content === "") return [];

  // The decision authority is the shared markdown-link guard, so the hook and
  // the CLI half agree byte-for-byte on what counts as a violation.
  if (markdownLinkViolation(change.content) === null) return [];

  return [
    {
      severity: "error",
      check: HOOK_WIKILINK_CHECK,
      message: buildMessage(change.content),
      file: change.filePath,
    },
  ];
}

/**
 * Build the U4 "errors-that-teach" message, embedding the first offending
 * fragment so the author can locate the line without a separate grep — mirrors
 * the bash `check_content()` echo (scripts/check-wikilinks.sh:109).
 */
function buildMessage(content: string): string {
  const fragment = firstMarkdownLinkFragment(content);
  const example = fragment !== null ? ` (e.g. ${fragment})` : "";
  return `Wiki file uses [text](file.md) links${example}. Convert to [[Page Title]] wikilinks for Obsidian compatibility.`;
}

/**
 * Extract the first `[text](*.md)` fragment from `content`, excluding
 * frontmatter and fenced code blocks. Returns null when none is found.
 *
 * Reuses `splitFrontmatter` and the same fence-stripping as
 * `markdownLinkViolation` so detection and reporting stay aligned. The `s`
 * (dotAll) flag matches `\r` inside link text, pinning the same CR regression
 * anchor as wikilinks.ts (json-envelope.bats test 311).
 */
function firstMarkdownLinkFragment(content: string): string | null {
  const { body } = splitFrontmatter(content);
  const stripped = stripFencedBlocks(body);
  const match = /\[.+?\]\([^)]+\.md\)/s.exec(stripped);
  return match !== null ? (match[0] ?? null) : null;
}

/** Remove ```-fenced blocks (matches the bash `sed '/^```/,/^```/d'`). */
function stripFencedBlocks(body: string): string {
  const out: string[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) out.push(line);
  }
  return out.join("\n");
}
