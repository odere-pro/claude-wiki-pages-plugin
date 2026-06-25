/**
 * Wikilink-collision check (ADR-0030 §4).
 *
 * A `wikilink-collision` is a normalised link name claimed by more than one
 * page across the two tiers Obsidian actually resolves — **basename ∪ alias**.
 * `title` is excluded: Obsidian never resolves by `title`, so a title/basename
 * overlap is not an Obsidian misroute (ADR-0030 §3). When a name collides,
 * Obsidian silently opens the basename winner (basename beats alias), shadowing
 * the alias page — the link "resolves" but lands on the wrong, often thinner,
 * page (gotcha #18). This surfaces that as one WARN per colliding name.
 *
 * The bash twin lives in scripts/verify-ingest.sh (`wikilink-collision` block)
 * and must emit the identical WARN count on the reference vault; gate-05 pins
 * the agreement. Messages need not match byte-for-byte — gate-05 compares
 * counts — but both sides select the same winner via the resolution ladder.
 */

import { buildLinkIndex, resolveLink, type LinkIndex } from "./link-resolver.ts";
import type { Finding } from "./report.ts";

/** Add every file under `name` into the claims map (basename ∪ alias union). */
function addClaims(
  claims: Map<string, Set<string>>,
  source: ReadonlyMap<string, readonly string[]>,
): void {
  for (const [name, files] of source) {
    let set = claims.get(name);
    if (set === undefined) {
      set = new Set<string>();
      claims.set(name, set);
    }
    for (const f of files) set.add(f);
  }
}

/**
 * Return one `Finding{ severity: "warn", check: "wikilink-collision" }` per
 * normalised name claimed by ≥2 distinct pages over basename ∪ alias, sorted by
 * name for determinism. A page whose basename equals its own alias claims one
 * file → never flagged.
 *
 * @param wiki  Absolute path to the `wiki/` directory.
 * @param index Optional prebuilt index (reused by `verify` to avoid a re-walk).
 */
export function checkCollisions(wiki: string, index?: LinkIndex): readonly Finding[] {
  const idx = index ?? buildLinkIndex(wiki);

  const claims = new Map<string, Set<string>>();
  addClaims(claims, idx.byBasename);
  addClaims(claims, idx.byAlias);

  const findings: Finding[] = [];
  for (const name of [...claims.keys()].sort()) {
    const files = claims.get(name) as Set<string>;
    if (files.size < 2) continue;

    // Obsidian's winner, by the resolution ladder (basename beats alias).
    const resolved = resolveLink(name, "", idx);
    const winner = resolved?.file ?? [...files].sort()[0] ?? name;
    const winnerKind = resolved?.kind ?? "basename";
    const losers = [...files].filter((f) => f !== winner).sort();

    findings.push({
      severity: "warn",
      check: "wikilink-collision",
      message:
        `wikilink-collision: [[${name}]] resolves to ${files.size} pages — ` +
        `Obsidian opens ${winner} (${winnerKind}), shadowing ${losers.join(", ")}; ` +
        `rename or disambiguate`,
      file: winner,
    });
  }

  return Object.freeze(findings);
}
