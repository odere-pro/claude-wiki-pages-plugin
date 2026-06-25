/**
 * link-demote.ts — the ONE demote-not-delete core (ADR-0036).
 *
 * The fence- and inline-span-aware text surgery that turns a `[[wikilink]]` the
 * policy rejects into its plain display text, and prunes rejected entries from
 * association frontmatter arrays — WITHOUT ever creating a dangling link (it
 * demotes to text, it does not delete the target page). Backs the strict-tree
 * reducer (scripts/strict-tree-reduce.ts), parameterised by its keep predicate,
 * so the demote contract lives in one place and cannot drift.
 *
 * The policy — which links to keep — is the caller's. Each function takes a
 * `KeepLink` predicate over the raw inner link text (`[[…]]`), already bound to
 * the source page by the caller. This module is pure text rewriting: no vault
 * walk, no resolver, no I/O. Node built-ins only (core dependency rule).
 */

/** Matches each `[[inner]]` wikilink; group 1 is the raw inner text. */
export const LINK_RE = /\[\[([^[\]]+?)\]\]/g;

/** True = keep this `[[wikilink]]`; false = demote/prune it. */
export type KeepLink = (raw: string) => boolean;

export interface FrontmatterSplit {
  /** Raw YAML inner text (without the `---` fences), or null when absent. */
  fm: string | null;
  /** Everything after the closing fence (or the whole file when no frontmatter). */
  body: string;
  /** The full `--- … ---` block including both fences, or "" when absent. */
  block: string;
}

/**
 * Split a document into its leading `--- … ---` block and body. Unlike
 * src/core/frontmatter.splitFrontmatter, this preserves the exact `block` text
 * so a rewrite can reassemble the file byte-for-byte.
 */
export function splitFrontmatter(text: string): FrontmatterSplit {
  if (!text.startsWith("---")) return { fm: null, body: text, block: "" };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { fm: null, body: text, block: "" };
  return { fm: text.slice(3, end), body: text.slice(end + 4), block: text.slice(0, end + 4) };
}

/** Text Obsidian shows: the piped alias, else the bare target minus anchor. */
export function linkDisplay(raw: string): string {
  if (raw.includes("|")) return raw.split("|").slice(1).join("|").trim();
  return raw.split("#")[0]!.split("^")[0]!.trim();
}

/** Split a line into [segment, isCodeSpan] runs so inline code is never rewritten. */
export function* splitCodeSpans(text: string): Generator<[string, boolean]> {
  for (const p of text.split(/(`+[^`]*`+)/)) {
    if (!p) continue;
    yield [p, /^`+/.test(p)];
  }
}

/**
 * Demote every body `[[wikilink]]` the predicate rejects to its display text,
 * skipping fenced code blocks and inline code spans. Returns the rewritten body
 * and the number of links demoted.
 */
export function demoteInBody(body: string, keep: KeepLink): [string, number] {
  const out: string[] = [];
  let inFence = false;
  let marker = "";
  let demoted = 0;
  for (const line of body.split("\n")) {
    const s = line.replace(/^\s+/, "");
    if (!inFence && (s.startsWith("```") || s.startsWith("~~~"))) {
      inFence = true;
      marker = s.slice(0, 3);
      out.push(line);
      continue;
    }
    if (inFence) {
      if (s.startsWith(marker)) {
        inFence = false;
        marker = "";
      }
      out.push(line);
      continue;
    }
    const res: string[] = [];
    for (const [seg, isCode] of splitCodeSpans(line)) {
      if (isCode) {
        res.push(seg);
        continue;
      }
      res.push(
        seg.replace(LINK_RE, (full: string, raw: string) => {
          if (keep(raw)) return full;
          demoted += 1;
          return linkDisplay(raw);
        }),
      );
    }
    out.push(res.join(""));
  }
  return [out.join("\n"), demoted];
}

/**
 * Prune rejected `[[wikilink]]` entries from inline-array frontmatter fields in
 * `fields`. Spine and provenance fields are never passed in. Returns the
 * rewritten YAML inner text and the number of entries pruned.
 */
export function pruneFields(
  fmRaw: string,
  keep: KeepLink,
  fields: ReadonlySet<string>,
): [string, number] {
  let pruned = 0;
  const lines = fmRaw.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    const m = /^(\s*([a-z_]+):\s*)(\[.*\])\s*$/.exec(lines[idx]!);
    if (!m) continue;
    if (!fields.has(m[2]!)) continue;
    const prefix = m[1]!;
    const arr = m[3]!;
    const items = [...arr.matchAll(/"([^"]*)"/g)].map((x) => x[1]!);
    const kept: string[] = [];
    for (const it of items) {
      const lm = new RegExp(LINK_RE.source).exec(it);
      if (lm && !keep(lm[1]!)) {
        pruned += 1;
        continue;
      }
      kept.push(it);
    }
    lines[idx] = prefix + "[" + kept.map((k) => `"${k}"`).join(", ") + "]";
  }
  return [lines.join("\n"), pruned];
}
