/**
 * wikilink-gate — the hook-mode decision logic that scripts/check-wikilinks.sh
 * ran inline (the stdin path, lines 96-143), now in the engine
 * (migration-plan.md Phase 3).
 *
 * This is the firewall-adjacent wrapper around the pure decision core in
 * [`../../core/hook-wikilink-check.ts`](../../core/hook-wikilink-check.ts): it
 * takes a parsed HookInput plus the resolved vault basename and returns a
 * HookDecision the CLI serialises into the `{"decision":"block","reason":…}`
 * contract. The per-content rule (a `[text](file.md)` markdown link in an
 * in-scope `wiki/` body) lives in the core module; this gate adds only the
 * hook-specific wrapping the bash hook performed:
 *
 *   1. Path filter — gate only paths under `<vaultName>/wiki/`; else allow (the
 *      bash case glob matching a `<VAULT_NAME>/wiki/` path segment).
 *   2. Edit tool — scan `new_string`; block when it introduces a markdown link
 *      (the bash Edit branch, with its dedicated "Edit introduces" reason).
 *   3. Write tool — empty content → allow; else scan `content` and block on the
 *      first violation (the bash `check_content` reason verbatim).
 *
 * ADVISORY classification (this unit's contract): a wiki-content style gate, not
 * a security boundary. The bash wrapper that calls this fails OPEN on an internal
 * error (Bun-absent → exit 0, the write proceeds) — see scripts/check-wikilinks.sh.
 * This module itself never throws: the core returns `[]` on malformed content.
 *
 * No `any`; the HookInput is already narrowed at the boundary
 * (src/core/hook-input.ts). Deterministic: same input → same decision.
 */

import type { HookInput } from "../../core/hook-input.ts";
import { isWikiFilePath } from "../../core/hook-wikilink-check.ts";
import type { HookDecision } from "./frontmatter-gate.ts";

/** Frozen allow decision (the bash `exit 0` with no block JSON). */
const ALLOW: HookDecision = Object.freeze({ block: false });

export interface WikilinkGateOptions {
  /** Basename of the resolved active vault (the bash `$VAULT_NAME`). */
  readonly vaultName: string;
  /** The parsed, boundary-narrowed hook payload. */
  readonly input: HookInput;
}

/**
 * The hook-mode wikilink gate decision.
 *
 * Returns an allow/block decision matching scripts/check-wikilinks.sh's hook
 * mode exactly: the path filter, the Edit `new_string` scan (dedicated reason),
 * and the Write `content` scan (the `check_content` reason verbatim).
 */
export function wikilinkHookGate(opts: WikilinkGateOptions): HookDecision {
  const { vaultName, input } = opts;

  // Rule 1: path filter — only gate paths under <vaultName>/wiki/.
  if (!isWikiFilePath(input.filePath, vaultName)) return ALLOW;

  // Rule 2: Edit tool — scan new_string; block on an introduced markdown link.
  // The bash Edit branch greps new_string DIRECTLY (no frontmatter/fence strip,
  // scripts/check-wikilinks.sh:125) and emits a DISTINCT reason ("Edit
  // introduces …"), so it is reconstructed here verbatim — not the core Write
  // message and not the Write path's fence stripping.
  if (input.toolName === "Edit") {
    if (input.newString === "") return ALLOW;
    const fragment = firstMarkdownLinkRaw(input.newString);
    if (fragment === null) return ALLOW;
    return Object.freeze({
      block: true,
      reason: `Edit introduces [text](file.md) links (e.g. ${fragment}). Use [[Page Title]] wikilinks for Obsidian compatibility.`,
    });
  }

  // Rule 3: Write tool — empty content → allow; else the bash `check_content`
  // contract VERBATIM. NOTE the integration finding: the shared core module
  // src/core/hook-wikilink-check.ts uses splitFrontmatter, which KEEPS the body
  // when content has no leading `---` frontmatter — but the bash hook used
  // `sed '1,/^---$/d'`, which strips the WHOLE content when there is no `---`
  // (so a no-frontmatter wiki body NEVER trips the block in bash). To preserve
  // the hook contract byte-for-byte (dual-run on the fixtures) we reproduce the
  // bash sed semantics here rather than calling the diverging core module.
  if (input.content === "") return ALLOW;
  const fragment = checkContentFragment(input.content);
  if (fragment === null) return ALLOW;
  return Object.freeze({
    block: true,
    reason: `Wiki file uses [text](file.md) links (e.g. ${fragment}). Convert to [[Page Title]] wikilinks for Obsidian compatibility.`,
  });
}

/**
 * The bash `check_content` body extractor + link scan VERBATIM:
 *   1. `body=$(echo "$content" | sed '1,/^---$/d')` — delete line 1 through the
 *      FIRST `^---$` line; if none exists, delete EVERYTHING (the key quirk:
 *      no-frontmatter content yields an empty body and never blocks).
 *   2. `body=$(echo "$body" | sed '/^```/,/^```/d')` — drop fenced code blocks.
 *   3. `grep -oE '\[.+\]\([^)]+\.md\)' | head -1` — the first greedy, per-line
 *      `[text](file.md)` fragment (the message example). Returns null when clean.
 */
function checkContentFragment(content: string): string | null {
  const body = stripBashFrontmatter(content);
  const stripped = stripFencedBlocks(body);
  return firstMarkdownLinkRaw(stripped);
}

/**
 * Replicate `sed '1,/^---$/d'`: delete line 1 through the first line that is
 * exactly `---` (after the bash `^---$` anchor). When no such line exists, the
 * sed range runs to EOF and deletes the whole input — so the body is empty.
 */
function stripBashFrontmatter(content: string): string {
  const lines = content.split("\n");
  let closeIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "---") {
      closeIdx = i;
      break;
    }
  }
  // No `---` line anywhere → sed deletes 1..$ → empty body.
  if (closeIdx === -1) return "";
  // Keep everything strictly after the matched `---` line.
  return lines.slice(closeIdx + 1).join("\n");
}

/**
 * Extract the first `[text](*.md)` fragment from an Edit `new_string`, mirroring
 * the bash Edit-branch `grep -oE '\[.+\]\([^)]+\.md\)' | head -1`
 * (scripts/check-wikilinks.sh:125) VERBATIM: greedy `.+`, line-scoped (grep
 * matches per-line), no frontmatter/fence stripping. Returns null when none is
 * found. The dotAll flag is NOT set so the per-line `grep` semantics hold —
 * `.` does not cross a newline.
 */
function firstMarkdownLinkRaw(text: string): string | null {
  for (const line of text.split("\n")) {
    const match = /\[.+\]\([^)]+\.md\)/.exec(line);
    if (match !== null) return match[0] ?? null;
  }
  return null;
}

/**
 * Replicate `sed '/^```/,/^```/d'`: delete every line from one beginning with a
 * triple-backtick fence to the next such line, INCLUSIVE. Matches the bash range
 * delete used to keep code-block examples from tripping the rule.
 */
function stripFencedBlocks(body: string): string {
  const out: string[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue; // the fence line itself is deleted in both states.
    }
    if (!inFence) out.push(line);
  }
  return out.join("\n");
}
