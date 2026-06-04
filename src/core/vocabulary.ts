/**
 * Synonym lexicon loader — `_vocabulary.md` at vault root.
 *
 * The lexicon is the single source for curated synonym groups used in Tier-2
 * deterministic recall. It is filename-addressed (`_vocabulary.md`), NOT
 * type-enum-addressed — no `type:` field is required and none is added to the
 * page-type enum. The engine never writes this file; humans curate it.
 *
 * Contract (§5 NO-RAG absolute): zero network, zero embeddings, zero ML.
 * All lookups are deterministic string operations over an in-memory Map.
 */

import { join } from "node:path";
import { readFileSafe } from "./fs.ts";
import { parseFrontmatter } from "./frontmatter.ts";

/** Filename of the vocabulary file — siblings with `wiki/` at vault root. */
export const VOCABULARY_FILE = "_vocabulary.md";

/**
 * The compiled synonym lexicon: a bidirectional expansion map.
 * `expand.get(form)` returns the set of OTHER forms in the same synonym class.
 * All keys and values are lowercased+trimmed. Absent file → empty map.
 */
export interface SynonymLexicon {
  readonly expand: ReadonlyMap<string, ReadonlySet<string>>;
}

/** An empty lexicon (used when the file is absent or unreadable). */
const EMPTY_LEXICON: SynonymLexicon = { expand: new Map() };

/**
 * Load and compile `_vocabulary.md` from the vault root.
 *
 * - Absent or unreadable file → returns EMPTY_LEXICON, never throws.
 * - Overlapping groups are union-merged into connected components: every form
 *   in a transitive overlap chain (group A shares a form with B, B with C, …)
 *   expands to the ENTIRE component. The closure is computed with union-find,
 *   so the result is independent of group declaration order.
 * - Output is fully deterministic regardless of file order (synonymsOf sorts).
 * - Each surface form is lowercased+trimmed before indexing.
 */
export function loadLexicon(vault: string): SynonymLexicon {
  const path = join(vault.replace(/\/+$/, ""), VOCABULARY_FILE);
  const content = readFileSafe(path);
  if (content === null) return EMPTY_LEXICON;

  let groups: Array<{ canonical: string; variants: unknown[] }>;
  try {
    const fm = parseFrontmatter(content);
    const raw = fm["groups"];
    if (!Array.isArray(raw)) return EMPTY_LEXICON;
    groups = raw as Array<{ canonical: string; variants: unknown[] }>;
  } catch {
    return EMPTY_LEXICON;
  }

  // Phase 1: collect all forms per group as normalised string arrays.
  const parsedGroups: Array<ReadonlyArray<string>> = [];
  for (const g of groups) {
    if (typeof g !== "object" || g === null) continue;
    const canon = typeof g.canonical === "string" ? g.canonical.toLowerCase().trim() : null;
    if (canon === null || canon === "") continue;
    const variantArr = Array.isArray(g.variants) ? g.variants : [];
    const variants = variantArr
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.toLowerCase().trim())
      .filter((v) => v !== "");
    const allForms = [canon, ...variants];
    if (allForms.length > 0) parsedGroups.push(allForms);
  }

  // Phase 2: compute the FULL connected-component closure via union-find.
  //
  // Each surface form is a node; every group connects all of its forms. A
  // transitive overlap chain (group A shares a form with B, B with C, …) must
  // collapse into ONE component so every form expands to the entire component —
  // regardless of group declaration order. A single forward pass would compute
  // only a partial, order-sensitive closure (the bug this replaces); union-find
  // is order-independent by construction.
  const parent = new Map<string, string>();

  function find(x: string): string {
    let root = x;
    // path to root
    while (parent.get(root) !== root && parent.get(root) !== undefined) {
      root = parent.get(root) as string;
    }
    // path compression
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur) as string;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  function union(a: string, b: string): void {
    if (parent.get(a) === undefined) parent.set(a, a);
    if (parent.get(b) === undefined) parent.set(b, b);
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    // Deterministic merge: smaller root (lexicographic) becomes the canonical
    // root so the structure does not depend on insertion order.
    if (ra < rb) parent.set(rb, ra);
    else parent.set(ra, rb);
  }

  // Register every form and union all members of each group together.
  for (const forms of parsedGroups) {
    for (const form of forms) {
      if (parent.get(form) === undefined) parent.set(form, form);
    }
    const first = forms[0];
    if (first === undefined) continue;
    for (let i = 1; i < forms.length; i++) {
      union(first, forms[i] as string);
    }
  }

  // Group all forms by their component root.
  const components = new Map<string, Set<string>>();
  for (const form of parent.keys()) {
    const root = find(form);
    let bucket = components.get(root);
    if (bucket === undefined) {
      bucket = new Set<string>();
      components.set(root, bucket);
    }
    bucket.add(form);
  }

  // Build the bidirectional expand map: each form → the OTHER forms in its
  // component. (synonymsOf sorts the result, so iteration order here is moot.)
  const expand = new Map<string, Set<string>>();
  for (const bucket of components.values()) {
    for (const form of bucket) {
      const others = new Set<string>();
      for (const peer of bucket) {
        if (peer !== form) others.add(peer);
      }
      expand.set(form, others);
    }
  }

  return { expand };
}

/**
 * Return the sorted list of synonyms for `term` according to the lexicon.
 *
 * Returns an empty array when the term is not in the lexicon.
 * The returned array is sorted (deterministic across invocations).
 * `term` is lowercased+trimmed internally; callers need not pre-normalise.
 */
export function synonymsOf(lexicon: SynonymLexicon, term: string): readonly string[] {
  const key = term.toLowerCase().trim();
  const set = lexicon.expand.get(key);
  if (set === undefined || set.size === 0) return [];
  return [...set].sort();
}
