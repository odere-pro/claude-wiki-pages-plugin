#!/usr/bin/env bun
/**
 * heal-ghost-links.ts — deterministically rewrite ghost wikilinks to piped
 * basename form `[[file-basename|Display]]`.
 *
 * A ghost link (ADR-0031 / src/core/ghost-link-check.ts) is a `[[link]]` the
 * plugin's index resolves but Obsidian does NOT — it wins only at the `alias:`
 * or `title:` tier, never a real path/basename — so it renders as a gray ghost
 * node floating beside the real page. The canonical example is a body source
 * citation written as `[[Source: ADR 0001 — …]]` that matches the source page's
 * `title:` but not its filename.
 *
 * The curator agent documented healing these by hand (§3.7), but that depends on
 * the LLM actually running the step and rewriting every finding — in practice it
 * left 100+ ghosts in a real ingest. This script makes the heal deterministic,
 * mirroring the engine's own `ghost-links` resolver: for every ghost link it
 * rewrites the target to the resolved file's basename while preserving the
 * display text and any `#heading`/`^block` anchor. Idempotent — a second run
 * finds nothing (the rewritten links now resolve by basename, not title).
 *
 * Reuses src/core (no second resolver): buildLinkIndex, resolveLink,
 * normaliseTarget, extractRawWikilinkTargets, isBookkeepingFile. Writes only
 * wiki/ page bodies/frontmatter; never touches raw/. Exit 0 on success; with
 * --check, exit 3 when ghosts remain (gate signal), 0 when clean.
 *
 * Usage: heal-ghost-links.ts --target <vault> [--json] [--check]
 */

import { join, relative, basename } from "node:path";
import { writeFileSync } from "node:fs";
import { listMarkdownRecursive, readFileSafe, isBookkeepingFile } from "../src/core/fs.ts";
import { buildLinkIndex, resolveLink, normaliseTarget } from "../src/core/link-resolver.ts";
import { extractRawWikilinkTargets } from "../src/core/wikilink-check.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string): boolean => process.argv.includes(name);

/** Split a raw wikilink inner string into its parts (Obsidian grammar). */
function parseLink(raw: string): { name: string; anchor: string; display: string | null } {
  const pipe = raw.indexOf("|");
  const linkPart = pipe === -1 ? raw : raw.slice(0, pipe);
  const display = pipe === -1 ? null : raw.slice(pipe + 1);
  // Anchor = first '#heading' or '^block' on the link part; preserved verbatim.
  let cut = linkPart.length;
  for (const sep of ["#", "^"]) {
    const i = linkPart.indexOf(sep);
    if (i !== -1 && i < cut) cut = i;
  }
  return {
    name: linkPart.slice(0, cut).trim(),
    anchor: linkPart.slice(cut),
    display: display,
  };
}

interface Heal {
  rel: string;
  rewrites: number;
}

function run(target: string, write: boolean): { heals: Heal[] } {
  const wiki = join(target, "wiki");
  const index = buildLinkIndex(wiki);
  const heals: Heal[] = [];

  for (const file of listMarkdownRecursive(wiki)) {
    if (isBookkeepingFile(file)) continue;
    const content = readFileSafe(file);
    if (content === null) continue;

    const sourceRel = relative(wiki, file).split(/[\\/]/).join("/");
    let text = content;
    let rewrites = 0;
    const seen = new Set<string>();

    for (const raw of extractRawWikilinkTargets(content)) {
      const norm = normaliseTarget(raw);
      if (norm === "" || seen.has(raw)) continue;
      seen.add(raw);

      const resolved = resolveLink(raw, sourceRel, index);
      if (resolved === null) continue; // dangling — not this script's job
      if (resolved.kind !== "alias" && resolved.kind !== "title") continue; // real link

      const { name, anchor, display } = parseLink(raw);
      const base = basename(resolved.file).replace(/\.md$/i, "");
      const replacement = `[[${base}${anchor}|${display ?? name}]]`;
      const bare = `[[${raw}]]`;
      const n = text.split(bare).length - 1;
      if (n > 0) {
        text = text.split(bare).join(replacement);
        rewrites += n;
      }
    }

    if (rewrites > 0) {
      if (write) writeFileSync(file, text);
      heals.push({ rel: sourceRel, rewrites });
    }
  }
  return { heals };
}

function main(): void {
  const target = arg("--target") ?? process.env.CLAUDE_WIKI_PAGES_VAULT ?? ".";
  const asJson = hasFlag("--json");
  const checkOnly = hasFlag("--check");

  const { heals } = run(target, !checkOnly);
  const total = heals.reduce((n, h) => n + h.rewrites, 0);

  const result = {
    command: "heal-ghost-links",
    vault: target,
    mode: checkOnly ? "check" : "write",
    files: heals.length,
    rewrites: total,
    detail: heals,
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const verb = checkOnly ? "ghost links remaining" : "ghost links healed";
    process.stdout.write(
      `heal-ghost-links (${result.mode}): ${total} ${verb} across ${heals.length} file(s)\n`,
    );
  }

  if (checkOnly && total > 0) process.exit(3);
}

main();
