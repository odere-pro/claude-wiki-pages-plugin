/**
 * `search` — deterministic full-text + frontmatter search over `wiki/`.
 *
 * The retrieval substrate the analyst agent uses before reasoning: it ranks wiki
 * pages by a transparent, reproducible score (title/alias/tag/body matches) and
 * returns each hit as a `[[wikilink]]` target so citations resolve. No
 * embeddings, no network — same query over the same vault yields the same
 * ranking, which is what keeps it gate-testable. GraphRAG (graph-aware
 * neighbourhood expansion over the wikilink graph) is a documented later phase.
 *
 * R4: every hit carries a `matched` score breakdown — one `MatchComponent` per
 * scoring channel that fired, where `score === sum(matched[].points)`. The
 * breakdown is JSON-only (an agent reads it for cut-off decisions); the human
 * text renderer never prints it.
 */

import { basename, join, relative } from "node:path";
import { listMarkdownRecursive, readFileSafe, BOOKKEEPING } from "../../core/fs.ts";
import { parseFrontmatter, titleOf, stringList, splitFrontmatter } from "../../core/frontmatter.ts";
import { resolveVault } from "../../core/vault.ts";

/**
 * One component of a hit's score breakdown: which scoring channel fired, the
 * query term that fired it, how many times it matched (pre-cap), and the points
 * it contributed after weights/caps. The atom of `SearchHit.matched`.
 *
 * `alias-term` is reserved for a future split of alias matches from title
 * matches (today both fold into the `title-*` channels via `titleHay`);
 * `graph-edge` will be appended by R2's `--graph` walk. Neither is emitted yet.
 */
export interface MatchComponent {
  readonly channel: "title-phrase" | "title-term" | "alias-term" | "tag-term" | "body-term";
  /** The query term that fired this component; empty for the whole-phrase channel. */
  readonly term: string;
  /** Match count pre-cap (e.g. raw body occurrences before BODY_HITS_CAP). */
  readonly hits: number;
  /** Points contributed after weights/caps; sums with siblings to `score`. */
  readonly points: number;
}

export interface SearchHit {
  readonly title: string;
  /** `[[wikilink]]` form of the title, ready to cite. */
  readonly wikilink: string;
  /** Vault-relative path to the page. */
  readonly file: string;
  readonly type: string;
  readonly score: number;
  /** First body line matching a query term, trimmed; empty when none. */
  readonly snippet: string;
  /**
   * R4 score breakdown — ordered points desc, then channel order, then term.
   * Hard invariant: `score === matched.reduce((s, m) => s + m.points, 0)`.
   * JSON-only; never rendered in `search`'s human text output.
   */
  readonly matched: readonly MatchComponent[];
}

export interface SearchReport {
  readonly command: "search";
  readonly vault: string;
  readonly query: string;
  readonly hits: readonly SearchHit[];
}

export interface SearchOptions {
  readonly target?: string;
  readonly cwd?: string;
  readonly query: string;
  /** Max hits returned. Default 20. */
  readonly limit?: number;
}

const DEFAULT_LIMIT = 20;
// Transparent, fixed weights so ranking is reproducible (and gate-testable).
const W_PHRASE_TITLE = 10;
const W_TERM_TITLE = 5;
const W_TERM_TAG = 3;
const W_TERM_BODY = 1;
const BODY_HITS_CAP = 5;

// Stable channel precedence for sorting a hit's match components when points tie.
const CHANNEL_ORDER: readonly MatchComponent["channel"][] = [
  "title-phrase",
  "title-term",
  "alias-term",
  "tag-term",
  "body-term",
];

/** Total order: points desc → channel precedence → term lexicographic. */
function sortMatchComponents(components: readonly MatchComponent[]): readonly MatchComponent[] {
  return [...components].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const ai = CHANNEL_ORDER.indexOf(a.channel);
    const bi = CHANNEL_ORDER.indexOf(b.channel);
    if (ai !== bi) return ai - bi;
    return a.term.localeCompare(b.term);
  });
}

function terms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle === "") return 0;
  let count = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    count++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return count;
}

export function search(opts: SearchOptions): SearchReport {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const query = opts.query.trim();
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const wiki = join(vault, "wiki");

  const qTerms = terms(query);
  const phrase = query.toLowerCase();
  if (qTerms.length === 0) {
    return { command: "search", vault, query, hits: [] };
  }

  const hits: SearchHit[] = [];
  for (const file of listMarkdownRecursive(wiki)) {
    if (BOOKKEEPING.has(basename(file, ".md"))) continue;
    const content = readFileSafe(file);
    if (content === null) continue;

    const fm = parseFrontmatter(content);
    const title = titleOf(content, file);
    const titleHay = [title, ...stringList(fm["aliases"])].join(" ").toLowerCase();
    const tagHay = stringList(fm["tags"]).join(" ").toLowerCase();
    const body = splitFrontmatter(content).body.toLowerCase();

    let score = 0;
    const components: MatchComponent[] = [];
    if (titleHay.includes(phrase)) {
      score += W_PHRASE_TITLE;
      components.push({ channel: "title-phrase", term: "", hits: 1, points: W_PHRASE_TITLE });
    }
    for (const t of qTerms) {
      if (titleHay.includes(t)) {
        score += W_TERM_TITLE;
        components.push({ channel: "title-term", term: t, hits: 1, points: W_TERM_TITLE });
      }
      if (tagHay.includes(t)) {
        score += W_TERM_TAG;
        components.push({ channel: "tag-term", term: t, hits: 1, points: W_TERM_TAG });
      }
      const bodyHits = countOccurrences(body, t);
      const bodyPoints = Math.min(bodyHits, BODY_HITS_CAP) * W_TERM_BODY;
      if (bodyPoints > 0) {
        score += bodyPoints;
        components.push({ channel: "body-term", term: t, hits: bodyHits, points: bodyPoints });
      }
    }
    if (score === 0) continue;

    const snippetLine =
      splitFrontmatter(content)
        .body.split("\n")
        .map((l) => l.trim())
        .find((l) => l && qTerms.some((t) => l.toLowerCase().includes(t))) ?? "";

    hits.push({
      title,
      wikilink: `[[${title}]]`,
      file: relative(vault, file),
      type: typeof fm["type"] === "string" ? (fm["type"] as string) : "",
      score,
      snippet: snippetLine.slice(0, 160),
      matched: sortMatchComponents(components),
    });
  }

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return { command: "search", vault, query, hits: hits.slice(0, limit) };
}
