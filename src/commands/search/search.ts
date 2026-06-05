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
 *
 * Tier-2 deterministic recall: the synonym lexicon (`_vocabulary.md` at vault
 * root) and a pure Porter stemmer expand the query term set BEFORE the scoring
 * loop. Synonym/stem matches score lower than exact matches but flow through the
 * same ranker — no second mechanism, no vectors, no network. Absent lexicon
 * degrades gracefully to exact-match-only behavior.
 */

import { basename, join, relative } from "node:path";
import { listMarkdownRecursive, readFileSafe, BOOKKEEPING } from "../../core/fs.ts";
import { parseFrontmatter, titleOf, stringList, splitFrontmatter } from "../../core/frontmatter.ts";
import { resolveVault } from "../../core/vault.ts";
import { loadLexicon, synonymsOf } from "../../core/vocabulary.ts";
import { stem, stemTokens } from "../../core/stem.ts";
import { walk, R2_EDGES } from "../../core/graph.ts";

/**
 * One component of a hit's score breakdown: which scoring channel fired, the
 * query term that fired it, how many times it matched (pre-cap), and the points
 * it contributed after weights/caps. The atom of `SearchHit.matched`.
 *
 * - `alias-term` is reserved for a future split of alias matches from title
 *   matches (today both fold into the `title-*` channels via `titleHay`).
 * - `graph-edge` will be appended by R2's `--graph` walk.
 * - `synonym-term` and `stem-term` are emitted by Tier-2 recall.
 */
export interface MatchComponent {
  readonly channel:
    | "title-phrase"
    | "title-term"
    | "alias-term"
    | "tag-term"
    | "body-term"
    | "synonym-term"
    | "stem-term"
    | "graph-edge";
  /** The original query term that fired this component. Empty for phrase channel. */
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
  /**
   * R1 candidate filter — restrict to pages whose frontmatter `type` equals
   * this value. Applied BEFORE scoring; does not affect the scoring weights.
   * Validation strategy (filter-only): the page-type enum is single-sourced in
   * `ontology-profile-v1` (docs/vault-example/CLAUDE.md §"Enum list"); no copy
   * exists in the engine. An unknown type simply matches no pages → empty hits.
   */
  readonly type?: string;
  /**
   * R1 candidate filter — restrict to pages whose vault-relative path starts
   * with this prefix (path-prefix match, trailing slash normalised). Applied
   * BEFORE scoring.
   */
  readonly folder?: string;
  /**
   * R1 candidate filter (best-effort) — restrict to pages whose frontmatter
   * `tags` list contains this exact value. Applied BEFORE scoring. Precision
   * only; no tag-vocabulary validation (governed taxonomy is a later item).
   */
  readonly tag?: string;
  /**
   * R2: opt-in N≤2 graph walk over `sources`+`related`+`depends_on` wikilinks.
   * Default: false (off). When absent/false, search behaves byte-identically to
   * the pre-graph baseline — zero graph code is observable on the default path.
   *
   * When true: after keyword+Tier-2 hits are computed, `walk()` is called with
   * the keyword hits as seeds. Graph neighbours are appended as new hits
   * (snippet:"", one graph-edge component) or used to augment existing hits
   * (graph-edge component added to their matched[] and points added to score).
   *
   * score===sum(matched.points) is preserved: every score+= is paired with a
   * matched component push. Graph is the WEAKEST signal (hop-decayed, strictly
   * below synonym). The `graph-edge` channel is LAST in CHANNEL_ORDER.
   */
  readonly graph?: boolean;
}

const DEFAULT_LIMIT = 20;
// Transparent, fixed weights so ranking is reproducible (and gate-testable).
// Exact channels:
const W_PHRASE_TITLE = 10;
const W_TERM_TITLE = 5;
const W_TERM_TAG = 3;
const W_TERM_BODY = 1;
const BODY_HITS_CAP = 5;
// Synonym channels (lower than exact):
const W_TERM_TITLE_SYNONYM = 2;
const W_TERM_TAG_SYNONYM = 1;
const W_TERM_BODY_SYNONYM = 1;
// Stem channels (lowest weight):
const W_TERM_TITLE_STEM = 1;
const W_TERM_TAG_STEM = 1;
const W_TERM_BODY_STEM = 1;

// Stable channel precedence for sorting a hit's match components when points tie.
// Exact channels first, then synonym, then stem, then graph-edge (last — weakest).
const CHANNEL_ORDER: readonly MatchComponent["channel"][] = [
  "title-phrase",
  "title-term",
  "alias-term",
  "tag-term",
  "body-term",
  "synonym-term",
  "stem-term",
  "graph-edge",
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

  // R1: normalise candidate filter values once.
  const filterType = opts.type !== undefined ? opts.type : undefined;
  // Normalise folder prefix: strip leading separator variants and trailing slashes
  // so "wiki/ai", "wiki/ai/" both match vault-relative paths like "wiki/ai/foo.md".
  const filterFolder = opts.folder !== undefined ? opts.folder.replace(/\/+$/, "") : undefined;
  const filterTag = opts.tag !== undefined ? opts.tag : undefined;

  const qTerms = terms(query);
  const phrase = query.toLowerCase();
  if (qTerms.length === 0) {
    return { command: "search", vault, query, hits: [] };
  }

  // Tier-2: load the synonym lexicon (absent file → empty, never throws).
  const lexicon = loadLexicon(vault);

  const hits: SearchHit[] = [];
  for (const file of listMarkdownRecursive(wiki)) {
    if (BOOKKEEPING.has(basename(file, ".md"))) continue;
    const content = readFileSafe(file);
    if (content === null) continue;

    const fm = parseFrontmatter(content);

    // R1: candidate filters — prune BEFORE scoring (AND composition).
    if (filterType !== undefined) {
      const pageType = typeof fm["type"] === "string" ? (fm["type"] as string) : "";
      if (pageType !== filterType) continue;
    }
    if (filterFolder !== undefined) {
      const rel = relative(vault, file);
      if (!rel.startsWith(filterFolder + "/") && rel !== filterFolder) continue;
    }
    if (filterTag !== undefined) {
      const pageTags = stringList(fm["tags"]);
      if (!pageTags.includes(filterTag)) continue;
    }

    const title = titleOf(content, file);
    const titleHay = [title, ...stringList(fm["aliases"])].join(" ").toLowerCase();
    const tagHay = stringList(fm["tags"]).join(" ").toLowerCase();
    const body = splitFrontmatter(content).body.toLowerCase();

    // Pre-compute stemmed token sets for the stem channel (tokenized pass only).
    const titleStemSet = stemTokens(titleHay);
    const tagStemSet = stemTokens(tagHay);
    const bodyStemSet = stemTokens(body);

    let score = 0;
    const components: MatchComponent[] = [];

    // ── Exact channels (unchanged from pre-Tier-2) ────────────────────────────
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

    // ── Tier-2 synonym and stem channels ──────────────────────────────────────
    // Collect which exact query terms already scored each field — used to skip
    // synonym/stem scoring for that (source, field) pair to prevent score inflation.
    const exactTitleTerms = new Set(qTerms.filter((t) => titleHay.includes(t)));
    const exactTagTerms = new Set(qTerms.filter((t) => tagHay.includes(t)));
    const exactBodyTerms = new Set(qTerms.filter((t) => countOccurrences(body, t) > 0));

    // Synonym channel: ONE component per (source query term, field).
    // Group all synonyms by source term. For each field, a single boolean title/tag
    // hit or a capped body-hit count is emitted — this prevents double-counting
    // when multiple synonyms of the same source term all match (e.g. "auto" and
    // "automobile" both being substrings of the page content).
    //
    // A (source, field) pair is only emitted if the source term did NOT already
    // score that field via the exact channel above.
    for (const t of qTerms) {
      const syns = synonymsOf(lexicon, t);
      if (syns.length === 0) continue;
      if (!exactTitleTerms.has(t) && syns.some((s) => titleHay.includes(s))) {
        score += W_TERM_TITLE_SYNONYM;
        components.push({
          channel: "synonym-term",
          term: t,
          hits: 1,
          points: W_TERM_TITLE_SYNONYM,
        });
      }
      if (!exactTagTerms.has(t) && syns.some((s) => tagHay.includes(s))) {
        score += W_TERM_TAG_SYNONYM;
        components.push({
          channel: "synonym-term",
          term: t,
          hits: 1,
          points: W_TERM_TAG_SYNONYM,
        });
      }
      if (!exactBodyTerms.has(t)) {
        // For the body, use the synonym with the MOST occurrences (avoids substring inflation
        // between synonyms where one is a prefix of another, e.g. "auto" inside "automobile").
        const bodyHits = Math.max(...syns.map((s) => countOccurrences(body, s)));
        const bodyPoints = Math.min(bodyHits, BODY_HITS_CAP) * W_TERM_BODY_SYNONYM;
        if (bodyPoints > 0) {
          score += bodyPoints;
          components.push({
            channel: "synonym-term",
            term: t,
            hits: bodyHits,
            points: bodyPoints,
          });
        }
      }
    }

    // Stem channel: ONE component per (source query term, field).
    // Uses tokenized set equality (NOT includes()) to avoid false substring matches.
    // Skip if the source term already scored the field exactly.
    for (const t of qTerms) {
      const s = stem(t);
      if (s === t) continue; // no useful stem expansion
      if (!exactTitleTerms.has(t) && titleStemSet.has(s)) {
        score += W_TERM_TITLE_STEM;
        components.push({
          channel: "stem-term",
          term: t,
          hits: 1,
          points: W_TERM_TITLE_STEM,
        });
      }
      if (!exactTagTerms.has(t) && tagStemSet.has(s)) {
        score += W_TERM_TAG_STEM;
        components.push({
          channel: "stem-term",
          term: t,
          hits: 1,
          points: W_TERM_TAG_STEM,
        });
      }
      if (!exactBodyTerms.has(t) && bodyStemSet.has(s)) {
        score += W_TERM_BODY_STEM;
        components.push({
          channel: "stem-term",
          term: t,
          hits: 1,
          points: W_TERM_BODY_STEM,
        });
      }
    }

    if (score === 0) continue;

    // Snippet from the body: first line matching any query term (exact qTerms only for humans).
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

  // ── R2: --graph walk (opt-in, off by default) ─────────────────────────────
  // When opts.graph is true, call walk() with the keyword hits as seeds.
  // Graph is the WEAKEST signal: W_GRAPH_HOP1=2, W_GRAPH_HOP2=1 (hop-decayed,
  // strictly ≤ synonym < direct title match). score===sum is preserved because
  // every score+= is paired with a components.push().
  //
  // Off-by-default guarantee: when opts.graph is absent or false, the block
  // below is entirely skipped — zero graph code is observable on the default
  // path (byte-identical to the pre-graph baseline).
  if (opts.graph === true) {
    // Build a file→mutableHit map for O(1) augmentation lookups.
    const hitByFile = new Map<
      string,
      (typeof hits)[number] & { score: number; matched: MatchComponent[] }
    >();
    // Re-build hits as mutable objects for this phase.
    // (hits[] already has readonly matched[] — we need mutable for augmentation.)
    const mutableHits: Array<{
      title: string;
      wikilink: string;
      file: string;
      type: string;
      score: number;
      snippet: string;
      matched: MatchComponent[];
    }> = hits.map((h) => ({
      title: h.title,
      wikilink: h.wikilink,
      file: h.file,
      type: h.type,
      score: h.score,
      snippet: h.snippet,
      matched: [...h.matched],
    }));
    for (const h of mutableHits) {
      hitByFile.set(h.file, h);
    }

    // Walk from all keyword hit files as seeds.
    const seedFiles = mutableHits.map((h) => h.file);
    const { refs } = walk({ vault, seeds: seedFiles, edges: R2_EDGES, maxHops: 2 });

    for (const ref of refs) {
      const graphComp: MatchComponent = {
        channel: "graph-edge",
        term: ref.via, // the predicate that created this edge
        hits: ref.hop, // hop distance (spec: "hits carries hop distance, not occurrence count")
        points: ref.score, // W_GRAPH_HOP1 or W_GRAPH_HOP2
      };

      const existing = hitByFile.get(ref.file);
      if (existing !== undefined) {
        // AUGMENT: keyword hit that is also a graph neighbor → add graph-edge component.
        existing.score += graphComp.points;
        existing.matched.push(graphComp);
        existing.matched = sortMatchComponents(existing.matched) as MatchComponent[];
      } else {
        // NEW: graph-only hit — bodyless (snippet:""), single graph-edge component.
        const newHit = {
          title: ref.wikilink.slice(2, -2), // strip [[ and ]]
          wikilink: ref.wikilink,
          file: ref.file,
          type: ref.type,
          score: graphComp.points,
          snippet: "",
          matched: [graphComp],
        };
        mutableHits.push(newHit);
        hitByFile.set(ref.file, newHit);
      }
    }

    // Re-apply sort + limit on the mutable hits (graph may have added new entries).
    mutableHits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    // Freeze matched arrays back to readonly and return.
    const frozenHits: SearchHit[] = mutableHits.slice(0, limit).map((h) => ({
      title: h.title,
      wikilink: h.wikilink,
      file: h.file,
      type: h.type,
      score: h.score,
      snippet: h.snippet,
      matched: sortMatchComponents(h.matched),
    }));
    return { command: "search", vault, query, hits: frozenHits };
  }

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return { command: "search", vault, query, hits: hits.slice(0, limit) };
}
