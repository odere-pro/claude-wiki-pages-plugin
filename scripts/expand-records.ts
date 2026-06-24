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
 *                     [--relation-fields <a,b>]     cross-record refs → field/value tags
 *                     [--records-key <name>]        array property when the source wraps it
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
// Cross-record relation fields (#57): array-valued cross-references like
// `corrective_patterns` or `resolves`. Each value becomes a `<field>/<value>`
// nested tag — never a wikilink — so the relationship is discoverable in the tag
// view without fusing the strict tree. Opt-in (default none); corpus-specific.
const relationFieldsArg = arg("--relation-fields");
const relationFields = relationFieldsArg
  ? relationFieldsArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];
const pageType = (arg("--type") ?? "concept") as "entity" | "concept";
const entityTypeField = arg("--entity-type-field") ?? "entity_type";
// When the source is an OBJECT wrapping the record array (e.g. a glossary
// `{ vocabulary, entities: [...] }`), the array property to fan out. Optional —
// auto-detected from common wrapper keys (entities/records/items/data/rows) or
// the single array-valued property when omitted.
const recordsKey = arg("--records-key");

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

// Common keys under which a JSON/YAML document wraps its record array.
const WRAPPER_KEYS = ["entities", "records", "items", "data", "rows"];

/**
 * Coerce a parsed JSON/YAML document to the record array. A top-level array is
 * used directly; an OBJECT is unwrapped via `--records-key` (explicit), else a
 * known wrapper key, else its single array-valued property. Throws a helpful
 * error naming the array-valued keys when it cannot decide.
 */
function coerceToArray(parsed: unknown, key: string | undefined, fmt: string): RecordMap[] {
  if (Array.isArray(parsed)) return parsed as RecordMap[];
  if (parsed !== null && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (key !== undefined) {
      if (Array.isArray(obj[key])) return obj[key] as RecordMap[];
      throw new Error(`${fmt} source has no array at --records-key "${key}"`);
    }
    for (const k of WRAPPER_KEYS) if (Array.isArray(obj[k])) return obj[k] as RecordMap[];
    const arrayKeys = Object.keys(obj).filter((k) => Array.isArray(obj[k]));
    if (arrayKeys.length === 1) return obj[arrayKeys[0]!] as RecordMap[];
    throw new Error(
      `${fmt} source is an object, not an array — pass --records-key <name> ` +
        `(array-valued keys: ${arrayKeys.join(", ") || "none"})`,
    );
  }
  throw new Error(`${fmt} source must be an array, or an object containing one`);
}

function loadRecords(path: string): RecordMap[] {
  const content = readFileSafe(path) ?? "";
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return coerceToArray(JSON.parse(content), recordsKey, "JSON");
  if (ext === "yaml" || ext === "yml") return coerceToArray(parseYaml(content), recordsKey, "YAML");
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

/**
 * Append `links` (`[[target|Display]]` strings) to an inline YAML array field
 * (`field: [...]`) in `text`, deduped by the link's target (the part before `|`).
 * Returns [newText, addedCount]. A block-style or absent field is left unchanged
 * (added 0) so YAML is never malformed and idempotency holds.
 */
function appendInlineArray(text: string, field: string, links: string[]): [string, number] {
  const lines = text.split("\n");
  const re = new RegExp(`^(\\s*${field}:\\s*)\\[(.*)\\]\\s*$`);
  const targetOf = (s: string): string =>
    (/\[\[([^\]|#^]+)/.exec(s)?.[1] ?? s).trim().toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    const m = re.exec(lines[i]!);
    if (!m) continue;
    const existing = [...m[2]!.matchAll(/"([^"]*)"/g)].map((x) => x[1]!);
    const have = new Set(existing.map(targetOf));
    let added = 0;
    for (const l of links) {
      if (have.has(targetOf(l))) continue;
      existing.push(l);
      have.add(targetOf(l));
      added += 1;
    }
    if (added === 0) return [text, 0];
    lines[i] = m[1]! + "[" + existing.map((e) => `"${e}"`).join(", ") + "]";
    return [lines.join("\n"), added];
  }
  return [text, 0];
}

// ── resolve field name fallbacks ──────────────────────────────────────────────

const titleField = titleFieldOverride ?? firstPresent(records, ["name", "title", "label", idField]);
const hubField = hubFieldOverride ?? firstPresent(records, ["category", "family", "group"]);

// Source file metadata for `sources:` provenance. The source-note link slug is
// finalised AFTER the record/hub slugs are known so it can be deconflicted from
// them (see the deconfliction below) — a source named after its topic must not
// collide with the topic folder note by basename.
const sourceFileBase = basename(sourcePath).replace(/\.[^.]+$/, "");
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

const topicSlug = slugify(topic);
const topicTitle = titleCase(topicSlug);

// First pass: per-record metadata, computed once so the hub folder notes can list
// their records as `children:` (MOC reachability) and the record pages share the
// same slug/title — no second derivation can drift.
interface RecMeta {
  slug: string;
  title: string;
  hs: string; // hub slug; "" when the record has no hub
  tags: string[];
  summary: string;
  entityType: string;
}
const recMetas: RecMeta[] = [];
const seenRecSlugs = new Set<string>();
for (const rec of records) {
  const rawId = getStr(rec, idField);
  const rawTitle = getStr(rec, titleField, "name", "title", "label", idField);
  if (!rawId && !rawTitle) continue;
  const slug = rawId ? slugify(rawId) : slugify(rawTitle);
  if (!slug || seenRecSlugs.has(slug)) continue;
  seenRecSlugs.add(slug);
  const hubVal = str(rec[hubField]);
  // Tags: the page's topic slug (schema policy — topic slug + cross-cutting tags)
  // + nested taxonomy from the tag fields + cross-record relations as tags.
  const tags = [topicSlug];
  for (const tf of [...tagFields, ...relationFields]) tags.push(...fieldToTags(rec, tf));
  recMetas.push({
    slug,
    title: rawTitle || titleCase(slug),
    hs: hubVal ? slugify(hubVal) : "",
    tags: [...new Set(tags)],
    summary: getStr(rec, "summary", "description", "definition", "overview"),
    entityType: getStr(rec, entityTypeField) || "tool",
  });
}

// Group record child-links by hub (and collect hubless records) for the folder
// notes' `children:` lists, preserving record order for stable output.
//
// Sanitize the wikilink DISPLAY title: a `"` would need YAML-escaping inside the
// inline `children: [...]` array, which the structural verifier's list parser
// (a non-escape-aware regex) then mis-splits into a phantom child; `[ ] | # ^`
// would break the wikilink/anchor syntax itself. The page's own `title:` keeps
// the real (escaped) text — only the link label is sanitized.
const linkDisplay = (t: string): string =>
  t
    .replace(/["[\]|#^]/g, (c) => (c === '"' ? "'" : " "))
    .replace(/\s+/g, " ")
    .trim();
const childLink = (m: RecMeta): string => `[[${m.slug}|${linkDisplay(m.title)}]]`;
const childLinksByHub = new Map<string, string[]>();
const hublessChildLinks: string[] = [];
const hubSlugs: string[] = [];
const seenHubs = new Set<string>();
for (const m of recMetas) {
  if (m.hs) {
    if (!seenHubs.has(m.hs)) {
      seenHubs.add(m.hs);
      hubSlugs.push(m.hs);
    }
    (childLinksByHub.get(m.hs) ?? childLinksByHub.set(m.hs, []).get(m.hs)!).push(childLink(m));
  } else {
    hublessChildLinks.push(childLink(m));
  }
}

// Finalise the source-note slug, deconflicted from the generated folder-note and
// record basenames. A source named after its topic (e.g. principles.json → topic
// principles) would otherwise put `_sources/principles.md` and
// `principles/principles.md` in a basename collision, and the `parent:` spine
// would silently misroute to the source note (Obsidian resolves `[[principles]]`
// by basename). Append `-source` until the slug is unique.
const reservedSlugs = new Set<string>([topicSlug, ...hubSlugs, ...recMetas.map((m) => m.slug)]);
let sourceLinkSlug = slugify(sourceFileBase) || "source";
while (reservedSlugs.has(sourceLinkSlug)) sourceLinkSlug += "-source";
const sourceLinkTitle = titleCase(sourceLinkSlug);
const sourceNoteRel = `_sources/${sourceLinkSlug}.md`;

// Source summary note (wiki/_sources/<slug>.md). Every generated page cites this
// in `sources:`, so it MUST exist or those links dangle (schema: provenance is
// non-negotiable). Created here when absent so the fan-out is born verify-clean,
// not just strict-tree-clean. Never overwrites an existing source note — if the
// file was already ingested with richer metadata, that wins.
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

// Hub folder-note specs — type: index, parent → topic folder note, children → its
// records (so the fan-out is born MOC-reachable, not just strict-tree-clean).
for (const hs of hubSlugs) {
  const ht = titleCase(hs);
  const rel = `${topic}/${hs}/${hs}.md`;
  if (seenRels.has(rel)) continue;
  seenRels.add(rel);
  const abs = join(wikiDir, rel);
  const isNew = !existsSync(abs);
  const children = (childLinksByHub.get(hs) ?? []).map((l) => `"${l}"`).join(", ");

  const text =
    [
      `---`,
      `title: "${ht}"`,
      `type: index`,
      `aliases: ["${hs}", "${ht}"]`,
      `parent: "[[${topicSlug}|${topicTitle}]]"`,
      `path: "${topic}/${hs}"`,
      `children: [${children}]`,
      `child_indexes: []`,
      `tags: ["${topicSlug}"]`,
      `created: ${today}`,
      `updated: ${today}`,
      `---`,
    ].join("\n") + `\n\n# ${ht}\n`;

  specs.push({ abs, rel, text, kind: "hub", isNew });
}

// Per-record page specs.
for (const m of recMetas) {
  const rel = m.hs ? `${topic}/${m.hs}/${m.slug}.md` : `${topic}/${m.slug}.md`;
  if (seenRels.has(rel)) continue;
  seenRels.add(rel);
  const abs = join(wikiDir, rel);
  const isNew = !existsSync(abs);

  // Parent: hub folder note if hub exists, else topic folder note.
  const parentSlug = m.hs || topicSlug;
  const parentTitle = m.hs ? titleCase(m.hs) : topicTitle;
  const pathField = m.hs ? `${topic}/${m.hs}` : topic;

  const fmLines = [`---`, `title: "${m.title.replace(/"/g, '\\"')}"`, `type: ${pageType}`];
  if (pageType === "entity") fmLines.push(`entity_type: ${m.entityType}`);
  fmLines.push(
    `aliases: ["${m.slug}"]`,
    `parent: "[[${parentSlug}|${parentTitle}]]"`,
    `path: "${pathField}"`,
    `sources: ["[[${sourceLinkSlug}|${sourceLinkTitle}]]"]`,
    `tags: [${m.tags.map((t) => `"${t}"`).join(", ")}]`,
    `created: ${today}`,
    `updated: ${today}`,
    `update_count: 1`,
    `status: active`,
    `confidence: 0.9`,
    `---`,
  );

  const bodyLines = [`\n# ${m.title}\n`];
  if (m.summary) bodyLines.push(`\n${m.summary}\n`);
  bodyLines.push(`\n## Key Points\n`);

  specs.push({ abs, rel, text: fmLines.join("\n") + bodyLines.join(""), kind: "record", isNew });
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

// Make the fan-out MOC-reachable from index.md: append the new hub folder notes to
// the topic folder note's `child_indexes:` (and any hubless records to its
// `children:`), append-only. Without this the hubs are unreachable from the root
// MOC and verify-ingest emits "not reachable from index.md" warnings. Only inline
// `field: [...]` arrays are updated; a block-style or missing topic note is left
// for the polish MOC pass. Idempotent: links already present are not re-added.
const topicNoteAbs = join(wikiDir, `${topic}/${topicSlug}.md`);
const hubIndexLinks = hubSlugs.map((hs) => `[[${hs}|${titleCase(hs)}]]`);
let topicNoteUpdated = false;
if (apply && existsSync(topicNoteAbs)) {
  const orig = readFileSafe(topicNoteAbs) ?? "";
  let next = orig;
  let added = 0;
  if (hubIndexLinks.length) {
    const [t, n] = appendInlineArray(next, "child_indexes", hubIndexLinks);
    next = t;
    added += n;
  }
  if (hublessChildLinks.length) {
    const [t, n] = appendInlineArray(next, "children", hublessChildLinks);
    next = t;
    added += n;
  }
  if (added > 0 && next !== orig) {
    writeFileSync(topicNoteAbs, next);
    topicNoteUpdated = true;
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
  topicNoteUpdated,
  tagFields,
  relationFields,
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
