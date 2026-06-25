/**
 * frontmatter-validate — the pure validator replacing the awk-YAML parser in
 * scripts/validate-frontmatter.sh (migration-plan.md Phase 3, "biggest
 * correctness/security win").
 *
 * Authoring scope (this unit): the pure module + colocated tests only. Wiring
 * into `lint` / `cli` and retiring the bash twin are a later serial integrate
 * step (TEAM-BRIEF §9; migration-plan.md Phase 3 "parity-twin retirement").
 *
 * Parity target — every rule `validate_content` (validate-frontmatter.sh:221-346)
 * enforces:
 *   1. Missing YAML frontmatter block.
 *   2. Missing universal fields (`type`, `title`) — all reported together.
 *   3. Required fields per page type, read from the schema's
 *      "### Required fields by type" table (single source of truth, ADR-0014).
 *      Unknown type → "Unknown type: X. Allowed: …". Fail-CLOSED when the table
 *      is absent or has zero data rows (never silently require nothing).
 *   4. `source` with `source_format != text` requires `attachment_path` +
 *      `extracted_at`.
 *   5. `path:` field consistency with the file's actual wiki-relative directory
 *      (for entity/concept/topic/project/synthesis/index).
 *
 * Additive extension rules (this module hardens beyond the bash hot path, which
 * deliberately skipped these to avoid a second enum source / engine dependency):
 *   6. Page-type membership against the "### Enum list" page-type enum
 *      (subsumes rule 3's "Unknown type" using the single-sourced list).
 *   7. Provenance shape — `sources` must be a YAML list (or single wikilink
 *      string), never a scalar; `derived: true` must keep `confidence < 0.8`;
 *      `confidence`, when present, must be a number in [0, 1].
 *   8. `schema_version`, when present, must be a version `src/core/schema.ts`
 *      accepts — the single source of truth, not a private copy (TEAM-BRIEF §3).
 *
 * Provenance fields are sacred — these rules only *strengthen* sources /
 * source_quotes / derived / confidence; they never weaken them (TEAM-BRIEF §5).
 *
 * Parsing uses the real `yaml` library via src/core/frontmatter.ts — no awk/sed
 * heuristics. No `any`; untrusted frontmatter is `unknown`, narrowed at the
 * point of use. No network, no embeddings, deterministic: same input → same
 * findings.
 */

import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import type { Finding } from "./report.ts";
import { readFileSafe, listMarkdownRecursive } from "./fs.ts";
import { parseFrontmatter, splitFrontmatter, stringList } from "./frontmatter.ts";
import { parseTableRow } from "./markdown-table.ts";
import { SUPPORTED_SCHEMA_VERSIONS } from "./schema.ts";
import { DERIVED_CONFIDENCE_CEILING } from "./provenance.ts";

/** The `check` field stamped on every finding (matches the bash hook's "frontmatter"). */
export const FRONTMATTER_CHECK = "frontmatter" as const;

/** Universal fields required on every typed page (bash `for field in type title`). */
const UNIVERSAL_FIELDS = ["type", "title"] as const;

/**
 * Page types whose `path:` field is checked against the file's actual location.
 * Mirrors the bash `case "$type" in entity|concept|topic|project|synthesis|index)`.
 */
const PATH_CHECKED_TYPES = new Set(["entity", "concept", "topic", "project", "synthesis", "index"]);

// `DERIVED_CONFIDENCE_CEILING` (provenance.ts) and `SUPPORTED_SCHEMA_VERSIONS`
// (schema.ts) are imported above — single source of truth, no private copies.

// ── Schema-table parsing (single source of truth, ADR-0014) ──────────────────

/**
 * Parsed "### Required fields by type" table:
 *   byType.get(type) → required-field names for that type (may be empty list).
 * `null` signals the table is absent or has no data rows → caller fails closed.
 */
interface RequiredFieldsTable {
  /** type → its required-field names (universal `type`/`title` excluded). */
  readonly byType: ReadonlyMap<string, readonly string[]>;
  /** All type keys in document order, for the "Allowed:" message. */
  readonly allTypes: readonly string[];
}

/** Pull a backtick-wrapped or plain trimmed token from a single markdown cell. */
function cellToken(cell: string): string {
  const m = cell.match(/`([^`]+)`/);
  if (m && m[1] !== undefined) return m[1].trim();
  return cell.trim();
}

/**
 * Why the required-fields table failed to parse, so the caller can emit the same
 * fail-closed message the bash hook did (validate-frontmatter.sh distinguishes
 * "no heading at all" from "heading present but zero data rows").
 */
type TableFailure = "no-heading" | "no-rows";

/**
 * Parse the "### Required fields by type" table from a schema document.
 * Returns a TableFailure sentinel when the heading is absent ("no-heading") or
 * the heading is present but no data rows parse ("no-rows") — both fail closed,
 * but with distinct messages (bash parity).
 */
function parseRequiredFieldsTable(schemaContent: string): RequiredFieldsTable | TableFailure {
  const lines = schemaContent.split("\n");
  let inTable = false;
  const byType = new Map<string, readonly string[]>();
  const allTypes: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();
    if (!inTable) {
      if (trimmed === "### Required fields by type") inTable = true;
      continue;
    }
    // A new heading after the table ends the section.
    if (/^#{1,6}\s/.test(trimmed)) break;
    const cells = parseTableRow(line, 2);
    if (cells === null) continue;
    // Skip the column-header row. Bash matches "Required fields" anywhere on the
    // line (validate-frontmatter.sh `$0 ~ /Required fields/`), so the canonical
    // header `| Type | Required fields | Conditional |` is skipped — checking
    // only cell[0] would mis-parse "Type" as a real page type (parity defect).
    if (/required fields/i.test(trimmed)) continue;
    const typeCellRaw = cells[0] ?? "";
    const type = cellToken(typeCellRaw);
    if (type === "") continue;
    const requiredCell = cells[1] ?? "";
    const fields = cellToken(requiredCell)
      .split(/\s+/)
      .map((f) => f.replace(/`/g, "").trim())
      .filter((f) => f !== "" && f !== "—" && f !== "-");
    byType.set(type, Object.freeze(fields));
    allTypes.push(type);
  }

  if (!inTable) return "no-heading";
  if (allTypes.length === 0) return "no-rows";
  return Object.freeze({ byType, allTypes: Object.freeze(allTypes) });
}

// ── Field-presence helpers (operate on parsed YAML, not regex) ───────────────

/** True when the parsed frontmatter carries a non-undefined value for `field`. */
function hasField(fm: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(fm, field) && fm[field] !== undefined;
}

/** Trimmed string value of a frontmatter field, or "" when absent/non-string. */
function stringField(fm: Record<string, unknown>, field: string): string {
  const v = fm[field];
  return typeof v === "string" ? v.trim() : "";
}

// ── Individual rule checks (each returns a message string or null) ───────────

/** Rule 2: universal fields, all missing ones reported together (bash parity). */
function checkUniversalFields(fm: Record<string, unknown>, frontmatter: string): string | null {
  const missing = UNIVERSAL_FIELDS.filter((f) => !hasField(fm, f));
  if (missing.length === 0) return null;
  return `Missing required field(s): ${missing.join(", ")}\n---\n${frontmatter}\n---`;
}

/** Rule 3 + 6: per-type required fields, with single-sourced enum membership. */
function checkRequiredForType(
  type: string,
  fm: Record<string, unknown>,
  frontmatter: string,
  table: RequiredFieldsTable,
): string | null {
  if (!table.byType.has(type)) {
    return `Unknown type: ${type}. Allowed: ${table.allTypes.join(" ")}`;
  }
  const required = table.byType.get(type) ?? [];
  const missing = required.filter((f) => !hasField(fm, f));
  if (missing.length === 0) return null;
  return `${type} note missing required field(s): ${missing.join(", ")}\n---\n${frontmatter}\n---`;
}

/** Rule 4: source + non-text format requires attachment_path + extracted_at. */
function checkSourceAttachment(
  type: string,
  fm: Record<string, unknown>,
  frontmatter: string,
): string | null {
  if (type !== "source") return null;
  const fmt = stringField(fm, "source_format");
  if (fmt === "" || fmt === "text") return null;
  const missing = ["attachment_path", "extracted_at"].filter((f) => !hasField(fm, f));
  if (missing.length === 0) return null;
  return `source note with source_format: ${fmt} requires field(s): ${missing.join(", ")}\n---\n${frontmatter}\n---`;
}

/** Rule 5: declared `path:` must match the file's actual wiki-relative directory. */
function checkPathConsistency(
  type: string,
  fm: Record<string, unknown>,
  wikiRelativePath: string,
): string | null {
  if (!PATH_CHECKED_TYPES.has(type)) return null;
  const declared = stringField(fm, "path");
  if (declared === "") return null;
  // Expected = the directory portion of the wiki-relative path ("" at wiki root).
  const dir = dirname(wikiRelativePath);
  const expected = dir === "." ? "" : dir;
  if (expected === "") return null; // bash: [ -z "$expected_path" ] → skip
  if (declared !== expected) {
    return `path: field is '${declared}' but file is in '${expected}'. Update path to match actual location.`;
  }
  return null;
}

/** Rule 7a: `sources`, when present, must be a list (or a single wikilink string). */
function checkSourcesShape(fm: Record<string, unknown>): string | null {
  if (!hasField(fm, "sources")) return null;
  const raw = fm["sources"];
  if (Array.isArray(raw)) return null;
  if (typeof raw === "string") return null; // single inline value, coerced by stringList
  return `sources: must be a YAML list of source references, not a ${typeof raw} scalar.`;
}

/** Rule 7b: `derived: true` must keep `confidence < 0.8` (provenance.ts parity). */
function checkDerivedConfidence(fm: Record<string, unknown>): string | null {
  const derivedRaw = fm["derived"];
  const isDerived = derivedRaw === true || derivedRaw === "true";
  if (!isDerived) return null;
  const confidence = numericConfidence(fm["confidence"]);
  if (confidence !== null && confidence >= DERIVED_CONFIDENCE_CEILING) {
    return `derived: true requires confidence < ${DERIVED_CONFIDENCE_CEILING} (found ${confidence}); lower confidence to reflect inferred status.`;
  }
  return null;
}

/** Rule 7c: `confidence`, when present, must be a number in [0, 1]. */
function checkConfidenceRange(fm: Record<string, unknown>): string | null {
  if (!hasField(fm, "confidence")) return null;
  const confidence = numericConfidence(fm["confidence"]);
  if (confidence === null) {
    return `confidence: must be a number between 0 and 1.`;
  }
  if (confidence < 0 || confidence > 1) {
    return `confidence: ${confidence} is out of range — must be between 0 and 1.`;
  }
  return null;
}

/** Rule 8: `schema_version`, when present, must be a version `schema.ts` accepts. */
function checkSchemaVersion(fm: Record<string, unknown>): string | null {
  if (!hasField(fm, "schema_version")) return null;
  const raw = fm["schema_version"];
  let version: number | null = null;
  if (typeof raw === "number") version = raw;
  else if (typeof raw === "string") {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) version = parsed;
  }
  if (version === null || !SUPPORTED_SCHEMA_VERSIONS.includes(version)) {
    return `schema_version: ${String(raw)} is not supported — must be ${SUPPORTED_SCHEMA_VERSIONS.join(" or ")}.`;
  }
  return null;
}

/** Narrow a frontmatter `confidence` value to a finite number, or null. */
function numericConfidence(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

// ── Public per-file validator ────────────────────────────────────────────────

/**
 * Validate one wiki page's frontmatter against the schema.
 *
 * Returns the first violation message (mirroring the bash short-circuit:
 * `validate_content` returns on the first failure), or `null` when the page is
 * fully conformant. The bash-equivalent rules (1-5) are checked first and in the
 * same order; the additive shape rules (6-8) run only once the structural rules
 * pass.
 *
 * @param wikiRelativePath  The page's path relative to `wiki/` (e.g.
 *                          "topics/biology/photosynthesis.md"). Used for the
 *                          `path:` consistency check.
 * @param content           The full file content (frontmatter + body).
 * @param schemaPath        Path to the schema CLAUDE.md carrying the
 *                          "### Required fields by type" + "### Enum list"
 *                          tables. Absent/malformed → fail-closed message.
 */
export function validateContent(
  wikiRelativePath: string,
  content: string,
  schemaPath: string,
): string | null {
  // Rule 1: a frontmatter block must be present.
  const { frontmatter } = splitFrontmatter(content);
  if (frontmatter === null) {
    return "Missing YAML frontmatter. Every wiki file must start with a --- block.";
  }

  const fm = parseFrontmatter(content);

  // Rule 2: universal fields.
  const universal = checkUniversalFields(fm, frontmatter);
  if (universal !== null) return universal;

  // Load the required-fields table (single source of truth). Fail closed when
  // it is absent or empty — never silently require nothing (bash FAIL_CLOSED).
  // The two failure modes carry distinct messages (bash parity): a missing
  // heading vs. a heading present with zero data rows (malformed table).
  const schemaContent = existsSync(schemaPath) ? readFileSafe(schemaPath) : null;
  const parsed = schemaContent !== null ? parseRequiredFieldsTable(schemaContent) : "no-heading";
  if (parsed === "no-heading") {
    return `no "### Required fields by type" table in ${schemaPath}; cannot validate`;
  }
  if (parsed === "no-rows") {
    return `required-field table heading found but no data rows parsed in ${schemaPath}; cannot validate`;
  }
  const table = parsed;

  const type = stringField(fm, "type");

  // Rules 3 + 6: per-type required fields + enum membership.
  const perType = checkRequiredForType(type, fm, frontmatter, table);
  if (perType !== null) return perType;

  // Rule 4: source attachment fields.
  const attach = checkSourceAttachment(type, fm, frontmatter);
  if (attach !== null) return attach;

  // Rule 5: path consistency.
  const pathMsg = checkPathConsistency(type, fm, wikiRelativePath);
  if (pathMsg !== null) return pathMsg;

  // Rules 7-8: provenance shape + schema_version (additive hardening).
  for (const check of [
    checkSchemaVersion(fm),
    checkSourcesShape(fm),
    checkDerivedConfidence(fm),
    checkConfidenceRange(fm),
  ]) {
    if (check !== null) return check;
  }

  return null;
}

// ── Public vault-level validator (CLI/lint composition) ──────────────────────

/**
 * The per-page validation outcome — one entry for EVERY `*.md` page under
 * `<vault>/wiki/`, conformant or not. This is the per-file granularity the bash
 * CLI plain-text mode emitted (`validate-frontmatter.sh`'s green/red loop printed
 * one `OK:`/`ERROR:` line per page), which `validateFrontmatter` collapses to
 * failures-only. Consumers that count one line per page — e.g.
 * `scripts/eval-ingest-extract.sh:_score_schema` — need the full list.
 */
export interface FrontmatterFileResult {
  /** Wiki-relative path (POSIX separators), e.g. "topics/biology/photosynthesis.md". */
  readonly file: string;
  /** True when the page is fully conformant (no violation). */
  readonly ok: boolean;
  /** The first violation message, or null when `ok` is true. */
  readonly message: string | null;
}

/**
 * Validate every `*.md` page under `<vault>/wiki/`, returning ONE result per
 * page (pass and fail), in the deterministic sorted order of
 * `listMarkdownRecursive`. This is the per-file granularity the bash CLI
 * plain-text mode emitted; `validateFrontmatter` derives its failures-only
 * findings from this list, so there is a single vault walk (DRY).
 *
 * A missing `wiki/` directory yields `[]`.
 */
export function validateFrontmatterFiles(
  vault: string,
  schemaPath?: string,
): FrontmatterFileResult[] {
  const wiki = join(vault, "wiki");
  if (!existsSync(wiki)) return [];

  const resolvedSchema = schemaPath ?? join(vault, "CLAUDE.md");
  const results: FrontmatterFileResult[] = [];

  for (const absPath of listMarkdownRecursive(wiki)) {
    const content = readFileSafe(absPath);
    if (content === null) continue;
    // wiki-relative path (POSIX separators) for the path check + file field.
    const wikiRelative = absPath
      .slice(wiki.length + 1)
      .split(/[\\/]/)
      .join("/");
    const message = validateContent(wikiRelative, content, resolvedSchema);
    results.push({ file: wikiRelative, ok: message === null, message });
  }

  return results;
}

/**
 * Validate every `*.md` page under `<vault>/wiki/`, returning one error-severity
 * `Finding` per non-conformant page (mirrors the bash CLI/JSON mode, which
 * emits one finding per failing file). The `file` field carries the
 * wiki-relative path, matching the bash JSON envelope.
 *
 * A missing `wiki/` directory yields `[]` — the CLI's exit-2 "bad target"
 * semantics are the caller's concern, not this pure function's.
 *
 * @param vault       Absolute path to the vault root (the directory holding
 *                    `wiki/` and `CLAUDE.md`).
 * @param schemaPath  Optional override for the schema document; defaults to
 *                    `<vault>/CLAUDE.md`.
 */
export function validateFrontmatter(vault: string, schemaPath?: string): Finding[] {
  return validateFrontmatterFiles(vault, schemaPath)
    .filter((r) => !r.ok && r.message !== null)
    .map((r) => ({
      severity: "error" as const,
      check: FRONTMATTER_CHECK,
      message: r.message as string,
      file: r.file,
    }));
}

// Re-export for callers that compose the list-coercion in their own findings.
export { stringList };
