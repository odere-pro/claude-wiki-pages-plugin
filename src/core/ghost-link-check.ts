/**
 * Ghost-wikilink check — Obsidian-accurate link resolution.
 *
 * `checkGhostLinks(wiki)` scans every non-BOOKKEEPING page under `wiki/` for
 * `[[links]]` that the plugin's index CAN resolve but Obsidian CANNOT — i.e.
 * links that resolve ONLY through the `alias:` or `title:` tiers, never through
 * a real file path or basename.
 *
 * Why this is distinct from the dangling check
 * ([`wikilink-check.ts`](./wikilink-check.ts)): the dangling check's resolvable
 * set is the deliberate superset path ∪ basename ∪ alias ∪ title (ADR-0031), so
 * a bare `[[Context Engineering]]` link that matches a page's `title:`/`aliases:`
 * but NOT its filename `context-engineering.md` is reported as RESOLVED — it
 * never appears as dangling. Yet Obsidian resolves a written link by PATH or
 * BASENAME only (schema CLAUDE.md → "Linking conventions"), so that same link
 * renders as a gray GHOST NODE in the graph, floating beside the real node.
 *
 * This check closes that blind spot: it calls `resolveLink` (the one resolver)
 * and flags every link whose winning tier is `alias` or `title`. The remedy is
 * always the same — rewrite to piped basename form `[[file-basename|Display]]`
 * (or a path-qualified target). The curator's link auto-fix consumes these
 * findings; `lint --check ghost-links` surfaces them for a human.
 *
 * Read-only. Same vault in, same findings out — no network, no embeddings.
 *
 * BOOKKEEPING pages (index, log, dashboard, manifest, _index, .gitkeep, and
 * folder notes with `type: index`) are skipped as SUBJECTS. Frontmatter
 * wikilinks ARE included in the scan (the same `[[ ]]` extraction the dangling
 * check uses).
 */

import { relative } from "node:path";
import { listMarkdownRecursive, readFileSafe, isBookkeepingFile } from "./fs.ts";
import { buildLinkIndex, resolveLink, normaliseTarget } from "./link-resolver.ts";
import { extractRawWikilinkTargets } from "./wikilink-check.ts";
import type { Finding } from "./report.ts";

/** Strip `|display`, `#heading`, `^block` decorations for the human-readable message. */
function displayTarget(raw: string): string {
  let display = raw;
  for (const sep of ["|", "#", "^"]) {
    const i = display.indexOf(sep);
    if (i !== -1) display = display.slice(0, i);
  }
  return display.trim();
}

/**
 * Scan every non-BOOKKEEPING page under `wiki/` and return one
 * `{ severity: "warn", check: "wikilink-ghost" }` finding per (file, distinct
 * normalised target) whose link resolves ONLY via `alias:` or `title:` — the
 * tiers Obsidian does not honour, so the link renders as a ghost node.
 *
 * @param wiki Absolute path to the `wiki/` directory.
 * @returns Immutable array of findings, sorted by (file asc, message asc).
 */
export function checkGhostLinks(wiki: string): readonly Finding[] {
  const index = buildLinkIndex(wiki);
  const findings: Finding[] = [];

  for (const file of listMarkdownRecursive(wiki)) {
    if (isBookkeepingFile(file)) continue;

    const content = readFileSafe(file);
    if (content === null) continue;

    const sourceRel = relative(wiki, file).split(/[\\/]/).join("/");
    const seen = new Set<string>();

    for (const raw of extractRawWikilinkTargets(content)) {
      const norm = normaliseTarget(raw);
      if (norm === "" || seen.has(norm)) continue;
      seen.add(norm);

      const resolved = resolveLink(raw, sourceRel, index);
      // A ghost is a link the plugin resolves but Obsidian does not: it wins
      // ONLY at the alias/title tier. path/basename hits are real (Obsidian
      // resolves them); a null result is a dangling link (the dangling check's
      // job), not a ghost.
      if (resolved !== null && (resolved.kind === "alias" || resolved.kind === "title")) {
        const display = displayTarget(raw);
        findings.push({
          severity: "warn",
          check: "wikilink-ghost",
          message: `ghost-wikilink: [[${display}]] in ${sourceRel} resolves only via ${resolved.kind} (matches ${resolved.file}) — Obsidian resolves by path/basename only, so it renders as a ghost node; rewrite as [[file-basename|${display}]]`,
          file: sourceRel,
        });
      }
    }
  }

  findings.sort((a, b) => {
    const fa = a.file ?? "";
    const fb = b.file ?? "";
    if (fa !== fb) return fa.localeCompare(fb);
    return a.message.localeCompare(b.message);
  });

  return Object.freeze(findings);
}
