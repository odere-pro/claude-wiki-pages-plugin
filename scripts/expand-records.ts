#!/usr/bin/env bun
/**
 * expand-records.ts — structured record fan-out (ADR-0036, #57).
 *
 * Reads a JSON, YAML, or CSV array source from vault/raw/ and generates:
 *   - One wiki page per record  (record → hub → topic-root spine)
 *   - One folder-note (hub) per distinct hub-field value
 *
 * Cross-record relations become nested taxonomy tags (`family/<x>`,
 * `severity/<x>`, `principle/<x>`) — never wikilinks — so the graph stays
 * strict-tree-shaped (ADR-0036). The result is born tree-shaped: a second run
 * of strict-tree-reduce on the output vault produces a zero diff.
 *
 * Dry-run by default; `--apply` writes pages (inside git — caller checkpoints).
 * Idempotent: pages that already exist are skipped, never overwritten.
 * Exit 0 always.
 *
 * Usage:
 *   expand-records.ts --target <vault> --source <path-in-raw/> --topic <topic-folder>
 *                     [--apply] [--json]
 *                     [--id-field <name>]          default: id
 *                     [--title-field <name>]        default: name → title → label
 *                     [--hub-field <name>]          default: category → family → group
 *                     [--tag-fields <a,b,c>]        default: family,severity,principle
 *                     [--type entity|concept]       default: concept
 *                     [--entity-type-field <name>]  default: entity_type (entities only)
 *                     [--date <YYYY-MM-DD>]         default: source file's mtime
 */

import { join, relative, basename, dirname } from "node:path";
import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { readFileSafe } from "../src/core/fs.ts";
import { parse as parseYaml } from "yaml";

// ── arg helpers ───────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

// ── validate required args ────────────────────────────────────────────────────

const targetArg = arg("--target");
const sourceArg = arg("--source");
const topicArg = arg("--topic");

if (!targetArg || !sourceArg || !topicArg) {
  console.error(
    "usage: expand-records.ts --target <vault> --source <path> --topic <topic-folder>\n" +
      "  [--apply] [--json] [--id-field name] [--title-field name]\n" +
      "  [--hub-field name] [--tag-fields a,b,c] [--type entity|concept]",
  );
  process.exit(2);
}

const apply = process.argv.includes("--apply");
const asJson = process.argv.includes("--json");
const vault = targetArg;
const topic = topicArg;
const idField = arg("--id-field") ?? "id";
const titleFieldOverride = arg("--title-field");
const hubFieldOverride = arg("--hub-field");
const tagFieldsArg = arg("--tag-fields");
const tagFields = tagFieldsArg
  ? tagFieldsArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : ["family", "severity", "principle"];
const pageType = (arg("--type") ?? "concept") as "entity" | "concept";
const entityTypeField = arg("--entity-type-field") ?? "entity_type";

// Resolve source path: absolute, vault-relative, or raw/-relative.
function resolveSource(vaultRoot: string, src: string): string {
  if (src.startsWith("/")) return src;
  const vaultRel = join(vaultRoot, src);
  if (existsSync(vaultRel)) return vaultRel;
  const rawRel = join(vaultRoot, "raw", src);
  if (existsSync(rawRel)) return rawRel;
  return vaultRel; // let the existence check below report the error
}

const sourcePath = resolveSource(vault, sourceArg);
if (!existsSync(sourcePath)) {
  console.error(`expand-records: source not found: ${sourcePath}`);
  process.exit(1);
}

// ── source parsing ────────────────────────────────────────────────────────────

type RecordMap = Record<string, unknown>;

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]!;
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCsv(content: string): RecordMap[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]!);
  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    const rec: RecordMap = {};
    for (let i = 0; i < headers.length; i++) {
      rec[headers[i]!] = values[i] ?? "";
    }
    return rec;
  });
}

function loadRecords(path: string): RecordMap[] {
  const content = readFileSafe(path) ?? "";
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) throw new Error("JSON source must be a top-level array");
    return parsed as RecordMap[];
  }
  if (ext === "yaml" || ext === "yml") {
    const parsed = parseYaml(content) as unknown;
    if (!Array.isArray(parsed)) throw new Error("YAML source must be a top-level array");
    return parsed as RecordMap[];
  }
  if (ext === "csv") return parseCsv(content);
  throw new Error(`Unsupported format .${ext} — supported: .json .yaml .yml .csv`);
}

let records: RecordMap[];
try {
  records = loadRecords(sourcePath);
} catch (e) {
  console.error(`expand-records: parse error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

// ── field helpers ─────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

function strList(v: unknown): string[] {
  if (Array.isArray(v)) return (v as unknown[]).map(str).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

function firstPresent(recs: RecordMap[], candidates: string[]): string {
  for (const c of candidates) {
    if (recs.some((r) => r[c] !== undefined && str(r[c]) !== "")) return c;
  }
  return candidates[0]!;
}

function getStr(rec: RecordMap, ...fields: string[]): string {
  for (const f of fields) {
    const v = str(rec[f]);
    if (v) return v;
  }
  return "";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convert a record field value(s) to `field/value` slash-nested tags. */
function fieldToTags(rec: RecordMap, field: string): string[] {
  return strList(rec[field])
    .map((v) => {
      const slug = slugify(v);
      return slug ? `${field}/${slug}` : "";
    })
    .filter(Boolean);
}

// ── resolve field name fallbacks ──────────────────────────────────────────────

const titleField = titleFieldOverride ?? firstPresent(records, ["name", "title", "label", idField]);
const hubField = hubFieldOverride ?? firstPresent(records, ["category", "family", "group"]);

// Source link slug for `sources:` frontmatter
const sourceFileBase = basename(sourcePath).replace(/\.[^.]+$/, "");
const sourceLinkSlug = slugify(sourceFileBase);
const sourceLinkTitle = titleCase(sourceLinkSlug);
const sourceRelPath = relative(vault, sourcePath);

// Date stamp for `created`/`updated`/`date_ingested`. Deterministic by design:
// an explicit `--date YYYY-MM-DD` wins; otherwise it is the SOURCE FILE's
// last-modified date (the same convention the extract-worker uses for
// `extracted_at`). Same input file → same output bytes, so the fan-out is
// reproducible and the idempotency/born-tree-shaped guarantees hold across days.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function sourceDate(path: string, override: string | undefined): string {
  if (override && DATE_RE.test(override)) return override;
  try {
    return statSync(path).mtime.toISOString().slice(0, 10);
  } catch {
    // Unreadable mtime — fall back to the epoch so output stays deterministic
    // (never a wall-clock read, which would break reproducibility).
    return "1970-01-01";
  }
}
const today = sourceDate(sourcePath, arg("--date"));

// ── plan generation ────────────────────────────────────────────────────────────

type PageKind = "source" | "hub" | "record";

interface PageSpec {
  abs: string;
  rel: string; // wiki-relative
  text: string;
  kind: PageKind;
  isNew: boolean;
}

const wikiDir = join(vault, "wiki");
const specs: PageSpec[] = [];
const seenRels = new Set<string>();

// Source summary note (wiki/_sources/<slug>.md). Every generated page cites this
// in `sources:`, so it MUST exist or those links dangle (schema: provenance is
// non-negotiable). Created here when absent so the fan-out is born verify-clean,
// not just strict-tree-clean. Never overwrites an existing source note — if the
// file was already ingested with richer metadata, that wins.
const sourceNoteRel = `_sources/${sourceLinkSlug}.md`;
{
  const abs = join(wikiDir, sourceNoteRel);
  const isNew = !existsSync(abs);
  seenRels.add(sourceNoteRel);
  const text =
    [
      `---`,
      `title: "${sourceLinkTitle}"`,
      `type: source`,
      `source_type: manual`,
      `source_format: text`,
      `date_ingested: ${today}`,
      `tags: []`,
      `aliases: ["${sourceLinkSlug}"]`,
      `sources: []`,
      `created: ${today}`,
      `updated: ${today}`,
      `status: active`,
      `confidence: 1.0`,
      `---`,
    ].join("\n") +
    `\n\n# ${sourceLinkTitle}\n\n## Metadata\n\nStructured record source: \`${sourceRelPath}\`\n\n## Summary\n\nFanned out into per-record pages under \`wiki/${topic}/\` by expand-records.\n`;
  specs.push({ abs, rel: sourceNoteRel, text, kind: "source", isNew });
}

// Collect distinct hub slugs (preserve insertion order for stable output).
const hubSlugs: string[] = [];
const seenHubs = new Set<string>();
for (const rec of records) {
  const hubVal = str(rec[hubField]);
  if (!hubVal) continue;
  const hs = slugify(hubVal);
  if (hs && !seenHubs.has(hs)) {
    seenHubs.add(hs);
    hubSlugs.push(hs);
  }
}

// Hub folder-note specs — type: index, parent → topic folder note.
const topicSlug = slugify(topic);
const topicTitle = titleCase(topicSlug);

for (const hs of hubSlugs) {
  const ht = titleCase(hs);
  const rel = `${topic}/${hs}/${hs}.md`;
  if (seenRels.has(rel)) continue;
  seenRels.add(rel);
  const abs = join(wikiDir, rel);
  const isNew = !existsSync(abs);

  const text =
    [
      `---`,
      `title: "${ht}"`,
      `type: index`,
      `aliases: ["${hs}", "${ht}"]`,
      `parent: "[[${topicSlug}|${topicTitle}]]"`,
      `path: "${topic}/${hs}"`,
      `children: []`,
      `child_indexes: []`,
      `tags: []`,
      `created: ${today}`,
      `updated: ${today}`,
      `---`,
    ].join("\n") + `\n\n# ${ht}\n`;

  specs.push({ abs, rel, text, kind: "hub", isNew });
}

// Per-record page specs.
for (const rec of records) {
  const rawId = getStr(rec, idField);
  const rawTitle = getStr(rec, titleField, "name", "title", "label", idField);
  if (!rawId && !rawTitle) continue;

  const slug = rawId ? slugify(rawId) : slugify(rawTitle);
  if (!slug) continue;
  const title = rawTitle || titleCase(slug);

  const hubVal = str(rec[hubField]);
  const hs = hubVal ? slugify(hubVal) : "";
  const rel = hs ? `${topic}/${hs}/${slug}.md` : `${topic}/${slug}.md`;

  if (seenRels.has(rel)) continue;
  seenRels.add(rel);
  const abs = join(wikiDir, rel);
  const isNew = !existsSync(abs);

  // Parent: hub folder note if hub exists, else topic folder note.
  const parentSlug = hs || topicSlug;
  const parentTitle = hs ? titleCase(hs) : topicTitle;
  const pathField = hs ? `${topic}/${hs}` : topic;

  // Nested taxonomy tags from configured tag fields.
  const tags: string[] = [];
  for (const tf of tagFields) {
    tags.push(...fieldToTags(rec, tf));
  }

  // Summary / description from common field names.
  const summary = getStr(rec, "summary", "description", "definition", "overview");

  const fmLines = [`---`, `title: "${title.replace(/"/g, '\\"')}"`, `type: ${pageType}`];

  if (pageType === "entity") {
    const et = getStr(rec, entityTypeField) || "tool";
    fmLines.push(`entity_type: ${et}`);
  }

  fmLines.push(
    `aliases: ["${slug}"]`,
    `parent: "[[${parentSlug}|${parentTitle}]]"`,
    `path: "${pathField}"`,
    `sources: ["[[${sourceLinkSlug}|${sourceLinkTitle}]]"]`,
    `tags: [${tags.map((t) => `"${t}"`).join(", ")}]`,
    `created: ${today}`,
    `updated: ${today}`,
    `update_count: 1`,
    `status: active`,
    `confidence: 0.9`,
    `---`,
  );

  const bodyLines = [`\n# ${title}\n`];
  if (summary) bodyLines.push(`\n${summary}\n`);
  bodyLines.push(`\n## Key Points\n`);

  specs.push({
    abs,
    rel,
    text: fmLines.join("\n") + bodyLines.join(""),
    kind: "record",
    isNew,
  });
}

// ── write pass ────────────────────────────────────────────────────────────────

let pagesNew = 0;
let pagesSkipped = 0;

for (const spec of specs) {
  if (!spec.isNew) {
    pagesSkipped++;
    continue;
  }
  pagesNew++;
  if (apply) {
    const dir = dirname(spec.abs);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(spec.abs, spec.text);
  }
}

// ── output ────────────────────────────────────────────────────────────────────

const hubsNew = specs.filter((s) => s.kind === "hub" && s.isNew).length;
const hubsExisting = specs.filter((s) => s.kind === "hub" && !s.isNew).length;
const sourceNoteCreated = specs.some((s) => s.kind === "source" && s.isNew);

const result = {
  vault,
  source: sourceRelPath,
  topic,
  applied: apply,
  recordsRead: records.length,
  pagesNew,
  pagesSkipped,
  hubsNew,
  hubsExisting,
  sourceNote: sourceNoteRel,
  sourceNoteCreated,
  tagFields,
  pages: specs.map((s) => ({ path: s.rel, kind: s.kind, isNew: s.isNew })),
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const mode = apply ? "APPLIED" : "DRY RUN (no files written; pass --apply)";
  console.log(`expand-records [${mode}]  vault: ${vault}`);
  console.log(`source: ${sourceRelPath}  topic: ${topic}  records: ${records.length}`);
  console.log(
    `new: ${pagesNew}  skipped (exists): ${pagesSkipped}  hubs: ${hubsNew} new / ${hubsExisting} existing`,
  );
  const newPages = result.pages.filter((p) => p.isNew);
  for (const p of newPages.slice(0, 40)) {
    const label = p.kind === "hub" ? "[hub]   " : p.kind === "source" ? "[source]" : "        ";
    console.log(`  ${label}  ${p.path}`);
  }
  if (newPages.length > 40) console.log(`  … and ${newPages.length - 40} more`);
}
