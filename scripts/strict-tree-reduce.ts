#!/usr/bin/env bun
/**
 * strict-tree-reduce.ts — strict-tree remediation (ADR-0036), the SOLE link
 * reducer: it demotes every NON-SPINE link among visible topic pages (siblings,
 * transitive-redundant ancestor links, cross-tree mentions) so the graph draws
 * only the `parent:` spine. Supersedes the retired topic-local pass (ADR-0033).
 *
 * Policy (ADR-0036 §1): KEEP a [[wikilink]] iff (a) it is a parent↔child spine
 * edge, or (b) it touches a hidden/scaffolding node (index/log/_sources/
 * _synthesis/manifest — this preserves `parent:`→index, the ROOT spine, and
 * `sources:` provenance). DEMOTE everything else (siblings, transitive-redundant
 * ancestor links, cross-tree mentions) to its display text, and PRUNE non-spine
 * entries from association frontmatter arrays.
 *
 * Tag de-cycle (ADR-0036 §3): when a cross-tree edge A(tree X)→B(tree Y) is
 * demoted, add the nested tag `topic/<Y>` to A's inline `tags:` array (deduped),
 * so the relationship stays discoverable in the tag view/colour without an edge.
 *
 * Contract: dry-run by default; `--apply` rewrites in
 * place (run inside git — the polish agent git-checkpoints it). Never touches
 * `parent`/`sources`/`children`/`child_indexes`, never creates a dangling link
 * (it demotes to text, it does not delete targets), idempotent (zero diff on a
 * tree-shaped vault).
 *
 * Reused from src/core (no second implementation): deriveSpine (the one spine
 * derivation), resolveLink/normaliseTarget (the resolution ladder), the
 * link-demote core (demoteInBody/pruneFields/splitFrontmatter), and
 * computeTreeMetric (oversaturation report only).
 *
 * Usage: strict-tree-reduce.ts --target <vault> [--apply] [--json] [--max-saturation <n>]
 */

import { join, relative } from "node:path";
import { writeFileSync } from "node:fs";
import { listMarkdownRecursive, readFileSafe } from "../src/core/fs.ts";
import { resolveLink, normaliseTarget } from "../src/core/link-resolver.ts";
import { splitFrontmatter, demoteInBody, pruneFields } from "../src/core/link-demote.ts";
import { deriveSpine } from "../src/core/spine.ts";
import { computeTreeMetric } from "../src/core/tree-metric.ts";

// Association fields whose non-spine entries fuse the graph. Spine fields
// (parent/children/child_indexes) and provenance (sources) are NEVER pruned.
const PRUNE_FIELDS = new Set([
  "related",
  "depends_on",
  "key_pages",
  "members",
  "scope",
  "contradicts",
  "supersedes",
]);
const DEFAULT_MAX_SATURATION = 20;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const target = arg("--target");
if (target === undefined) {
  console.error("usage: strict-tree-reduce.ts --target <vault> [--apply] [--json] [--max-saturation <n>]");
  process.exit(2);
}
const apply = process.argv.includes("--apply");
const asJson = process.argv.includes("--json");
const maxSatRaw = arg("--max-saturation");
const maxSaturationThreshold =
  maxSatRaw !== undefined && Number.isFinite(Number(maxSatRaw))
    ? Number(maxSatRaw)
    : DEFAULT_MAX_SATURATION;

const vault = target;
const wiki = join(vault, "wiki");

const spine = deriveSpine(wiki);
const { nodes, index } = spine;

/** Wiki-relative path with `/` separators. */
function toRel(abs: string): string {
  return relative(wiki, abs).split(/[\\/]/).join("/");
}

/**
 * Build a keep predicate bound to `srcRel`. Records the target trees of demoted
 * cross-tree links into `crossTrees` for the tag de-cycle pass.
 */
function makeKeep(srcRel: string, crossTrees: Set<string>): (raw: string) => boolean {
  const srcNode = nodes.get(srcRel);
  return (raw: string): boolean => {
    if (normaliseTarget(raw) === "") return true;
    const tgt = resolveLink(raw, srcRel, index)?.file ?? null;
    if (tgt === null) return true; // dangling — never create a danger, leave it
    const tgtNode = nodes.get(tgt);
    if (srcNode?.special || tgtNode?.special) return true; // touches hidden scaffolding
    if (srcNode !== undefined && srcNode.parent === tgt) return true; // child → parent
    if (tgtNode !== undefined && tgtNode.parent === srcRel) return true; // parent → child
    // Non-spine → demote. Record cross-tree for the topic/<Y> de-cycle tag.
    if (
      srcNode !== undefined &&
      tgtNode !== undefined &&
      srcNode.tree !== "" &&
      tgtNode.tree !== "" &&
      srcNode.tree !== tgtNode.tree
    ) {
      crossTrees.add(tgtNode.tree);
    }
    return false;
  };
}

const TAGS_LINE = /^(\s*tags:\s*)(\[.*\])\s*$/;

/**
 * Add `topic/<tree>` entries to the inline `tags:` array in `fmInner` for each
 * tree in `trees` not already present. Returns [newInner, added]. Only the inline
 * `tags: [...]` form is handled; a block-style or absent `tags:` is left
 * unchanged (added = 0) so YAML is never malformed.
 */
function addTopicTags(fmInner: string, trees: ReadonlySet<string>): [string, number] {
  const lines = fmInner.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    const m = TAGS_LINE.exec(lines[idx]!);
    if (!m) continue;
    const prefix = m[1]!;
    const items = [...m[2]!.matchAll(/"([^"]*)"/g)].map((x) => x[1]!);
    const have = new Set(items.map((t) => t.toLowerCase()));
    let added = 0;
    for (const tree of [...trees].sort()) {
      const tag = `topic/${tree}`;
      if (have.has(tag.toLowerCase())) continue;
      items.push(tag);
      have.add(tag.toLowerCase());
      added += 1;
    }
    if (added === 0) return [fmInner, 0];
    lines[idx] = prefix + "[" + items.map((t) => `"${t}"`).join(", ") + "]";
    return [lines.join("\n"), added];
  }
  return [fmInner, 0]; // no inline tags line
}

interface ReportRow {
  file: string;
  demoted: number;
  relatedPruned: number;
  topicTagsAdded: number;
  topicTags: string[];
}

const report: ReportRow[] = [];
let totalDemoted = 0;
let totalPruned = 0;
let totalTags = 0;

for (const abs of listMarkdownRecursive(wiki)) {
  const rel = toRel(abs);
  const node = nodes.get(rel);
  if (node?.special) continue; // hidden nodes keep every link
  const text = readFileSafe(abs) ?? "";
  const crossTrees = new Set<string>();
  const keep = makeKeep(rel, crossTrees);

  const { fm, body } = splitFrontmatter(text);
  let fmInner = fm;
  let pruned = 0;
  if (fm !== null) {
    const [prunedInner, n] = pruneFields(fm, keep, PRUNE_FIELDS);
    pruned = n;
    if (n > 0) fmInner = prunedInner;
  }
  const [newBody, demoted] = demoteInBody(body, keep);

  let tagsAdded = 0;
  const addedTags: string[] = [];
  if (fm !== null && crossTrees.size > 0) {
    const before = fmInner!;
    const [withTags, n] = addTopicTags(before, crossTrees);
    if (n > 0) {
      fmInner = withTags;
      tagsAdded = n;
      for (const t of [...crossTrees].sort()) addedTags.push(`topic/${t}`);
    }
  }

  if (pruned > 0 || demoted > 0 || tagsAdded > 0) {
    const newText = fm !== null ? "---" + fmInner + "\n---" + newBody : newBody;
    report.push({
      file: rel,
      demoted,
      relatedPruned: pruned,
      topicTagsAdded: tagsAdded,
      topicTags: addedTags,
    });
    totalDemoted += demoted;
    totalPruned += pruned;
    totalTags += tagsAdded;
    if (apply && newText !== text) writeFileSync(abs, newText);
  }
}

// Oversaturation (ADR-0036 §4): report-only — nodes whose out-degree exceeds the
// threshold. Spine fan-out is never cut (that would orphan children); the report
// suggests an intermediate hub. The transitive-redundant subset is already
// demoted above as ordinary non-spine edges.
const metric = computeTreeMetric(wiki);
const oversaturated = [...metric.saturation.entries()]
  .filter(([, deg]) => deg > maxSaturationThreshold)
  .map(([page, outDegree]) => ({ page, outDegree }))
  .sort((a, b) => b.outDegree - a.outDegree || a.page.localeCompare(b.page));

const result = {
  vault,
  applied: apply,
  filesChanged: report.length,
  bodyLinksDemoted: totalDemoted,
  relatedEntriesPruned: totalPruned,
  topicTagsAdded: totalTags,
  oversaturatedThreshold: maxSaturationThreshold,
  oversaturated,
  files: [...report].sort(
    (a, b) =>
      b.demoted + b.relatedPruned + b.topicTagsAdded - (a.demoted + a.relatedPruned + a.topicTagsAdded),
  ),
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const mode = apply ? "APPLIED" : "DRY RUN (no files written; pass --apply)";
  console.log(`strict-tree-reduce [${mode}]  vault: ${vault}`);
  console.log(
    `files changed: ${result.filesChanged}  links demoted: ${totalDemoted}  related entries pruned: ${totalPruned}  topic tags added: ${totalTags}`,
  );
  for (const r of result.files.slice(0, 30)) {
    const d = String(r.demoted).padStart(3, " ");
    const pr = String(r.relatedPruned).padStart(2, " ");
    const tg = r.topicTags.length ? `  +tags ${r.topicTags.join(",")}` : "";
    console.log(`  ${d}d ${pr}p  ${r.file}${tg}`);
  }
  if (result.files.length > 30) console.log(`  … and ${result.files.length - 30} more`);
  if (oversaturated.length) {
    console.log(`oversaturated nodes (out-degree > ${maxSaturationThreshold} — report only, consider an intermediate hub):`);
    for (const s of oversaturated.slice(0, 20)) console.log(`  ${String(s.outDegree).padStart(4)}  ${s.page}`);
  }
}
