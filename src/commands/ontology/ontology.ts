/**
 * `engine ontology --json` — one parser home (ADR-0015 N6, Part C).
 *
 * Regex-parses the `ontology-profile-v1` markdown tables from the schema
 * document (docs/vault-example/CLAUDE.md or the vault's CLAUDE.md) at read
 * time. Composes entity_type = core ∪ per-vault entity_type_extensions.
 * Emits predicates with extensible:false.
 *
 * CRITICAL NO-RAG / single-source rule (ADR-0015 V1 honored):
 *   This file contains ZERO enum-value string literals for entity_type or type.
 *   All values come exclusively from parsing the schema markdown.
 *   `grep -rn entity_type src/commands/ontology/` must show zero enum-value
 *   string literals — the schema markdown is the sole authority.
 *
 * Fail-closed (ADR-0015 Part C item 4):
 *   Malformed or missing tables → non-zero exit + error Finding.
 *   Never a silent empty success.
 */

import { readFileSync, existsSync } from "node:fs";
import { buildReport, type Finding, type Report } from "../../core/report.ts";

// ── Types ──────────────────────────────────────────────────────────────────────

/** One row in the predicate domain→range table. extensible is always false. */
export interface PredicateEntry {
  readonly predicate: string;
  readonly domain: string;
  readonly range: string;
  readonly direction: string;
  readonly extensible: false;
}

/** The machine-readable ontology manifest shape (ADR-0015 Part C named model). */
export interface OntologyManifest {
  readonly enums: {
    /** Closed page-type enum, in document order. */
    readonly type: readonly string[];
    /** entity_type = core ∪ vault entity_type_extensions, composed at read time. */
    readonly entity_type: readonly string[];
  };
  /** One entry per predicate-table row; extensible:false on every entry. */
  readonly predicates: readonly PredicateEntry[];
}

/** A Report carrying the ontology manifest. Flows through emit() unchanged. */
export interface OntologyReport extends Report {
  readonly manifest: OntologyManifest;
}

/** Success result from parseOntologyProfile. */
interface ParseOk {
  readonly ok: true;
  readonly manifest: OntologyManifest;
}

/** Failure result from parseOntologyProfile. */
interface ParseFail {
  readonly ok: false;
  readonly errors: readonly Finding[];
}

/** Union result type. */
export type ParseResult = ParseOk | ParseFail;

// ── Markdown table row extractor ───────────────────────────────────────────────

/**
 * Extract raw cell strings from a markdown table body row.
 * Handles leading/trailing `|` and trims whitespace from each cell.
 * Returns null for header/separator rows and rows with too few cells.
 */
function extractTableRow(line: string, minCells: number): readonly string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  // Skip separator rows: | --- | --- |
  if (/^\|[\s|:-]+\|?\s*$/.test(trimmed)) return null;
  const parts = trimmed.split("|");
  // Drop leading empty string from split on leading "|"
  const cells = parts.slice(1).map((c) => c.trim());
  // Drop trailing empty cell from trailing "|"
  if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  if (cells.length < minCells) return null;
  return cells;
}

/**
 * Extract a backtick-wrapped token from a cell, e.g. "`parent`" → "parent".
 * Returns null if no backtick-wrapped token is found.
 */
function extractBacktickToken(cell: string): string | null {
  const m = cell.match(/`([^`]+)`/);
  if (!m) return null;
  const val = m[1];
  return val !== undefined ? val : null;
}

/**
 * Extract comma-separated backtick-wrapped values from a cell.
 * E.g. "`source`,`entity`,`concept`" → ["source","entity","concept"]
 * Preserves document order.
 */
function extractBacktickValues(cell: string): readonly string[] {
  const values: string[] = [];
  let idx = 0;
  while (idx < cell.length) {
    const start = cell.indexOf("`", idx);
    if (start === -1) break;
    const end = cell.indexOf("`", start + 1);
    if (end === -1) break;
    values.push(cell.slice(start + 1, end));
    idx = end + 1;
  }
  return values;
}

// ── Section locators ───────────────────────────────────────────────────────────

/**
 * Find the line index of the predicate domain→range table section header.
 * Returns -1 if not found.
 */
function findPredicateTableHeader(lines: readonly string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l !== undefined && l.trim() === "### Predicate domain→range table") return i;
  }
  return -1;
}

/**
 * Find the line index of the enum list section header.
 */
function findEnumTableHeader(lines: readonly string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l !== undefined && l.trim() === "### Enum list") return i;
  }
  return -1;
}

// ── Predicate table parser ─────────────────────────────────────────────────────

/**
 * Parse the predicate domain→range table from the given schema content lines.
 * Returns PredicateEntry[] in document order.
 *
 * Table format:
 *   | Predicate | Domain (source class) | Range (target class) | Direction / cardinality |
 *   | --- | --- | --- | --- |
 *   | `parent` | ... | ... | ... |
 *
 * A row is valid iff its first cell contains a backtick-wrapped predicate name.
 */
function parsePredicateTable(lines: readonly string[]): PredicateEntry[] | null {
  const headerIdx = findPredicateTableHeader(lines);
  if (headerIdx === -1) return null;

  const entries: PredicateEntry[] = [];
  let inTable = false;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();
    if (trimmed === "") {
      if (inTable) break;
      continue;
    }
    if (trimmed.startsWith("|")) {
      inTable = true;
      // Skip the column-header row
      if (trimmed.includes("Predicate") && trimmed.includes("Domain")) continue;
      const cells = extractTableRow(line, 4);
      if (cells === null) continue;
      const cell0 = cells[0];
      const cell1 = cells[1];
      const cell2 = cells[2];
      const cell3 = cells[3];
      if (
        cell0 === undefined ||
        cell1 === undefined ||
        cell2 === undefined ||
        cell3 === undefined
      ) {
        continue;
      }
      const predName = extractBacktickToken(cell0);
      if (predName === null) continue;
      entries.push(
        Object.freeze({
          predicate: predName,
          domain: cell1,
          range: cell2,
          direction: cell3,
          extensible: false as const,
        }),
      );
    } else {
      if (inTable) break;
    }
  }

  return entries;
}

// ── Enum table parser ──────────────────────────────────────────────────────────

/**
 * Parse the enum list table from the given schema content lines.
 * Returns a Map of enum-name → values[], preserving document order.
 *
 * Table format:
 *   | Enum | Canonical values | Closed? | Calibration |
 *   | --- | --- | --- | --- |
 *   | page type (`type`) | `source`,`entity`,... | ... | ... |
 *   | `entity_type` ... | `person`,... | ... | ... |
 */
function parseEnumTable(lines: readonly string[]): Map<string, readonly string[]> | null {
  const headerIdx = findEnumTableHeader(lines);
  if (headerIdx === -1) return null;

  const enumMap = new Map<string, readonly string[]>();
  let inTable = false;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();
    if (trimmed === "") {
      if (inTable) break;
      continue;
    }
    if (trimmed.startsWith("|")) {
      inTable = true;
      if (trimmed.includes("Enum") && trimmed.includes("Canonical values")) continue;
      const cells = extractTableRow(line, 2);
      if (cells === null) continue;
      const nameCell = cells[0];
      const valuesCell = cells[1];
      if (nameCell === undefined || valuesCell === undefined) continue;

      // Determine the enum key from the name cell.
      // "page type (`type`)" → key is "type"
      // "`entity_type` ..." → key is the first backtick token
      let enumKey: string | null = null;
      if (nameCell.includes("page type") || nameCell.includes("(`type`)")) {
        enumKey = "type";
      } else {
        enumKey = extractBacktickToken(nameCell);
      }
      if (enumKey === null) continue;

      const values = extractBacktickValues(valuesCell);
      if (values.length > 0) {
        enumMap.set(enumKey, values);
      }
    } else {
      if (inTable) break;
    }
  }

  return enumMap.size > 0 ? enumMap : null;
}

// ── entity_type_extensions reader ─────────────────────────────────────────────

/**
 * Read entity_type_extensions from a vault's CLAUDE.md frontmatter.
 * Returns an empty array if not present or unparseable.
 *
 * Handles two YAML forms:
 *   entity_type_extensions: [dataset, model]       (flow sequence)
 *   entity_type_extensions:                         (block sequence)
 *     - dataset
 *     - model
 */
function readEntityTypeExtensions(vaultClaudeMd: string): readonly string[] {
  if (!existsSync(vaultClaudeMd)) return [];
  let content: string;
  try {
    content = readFileSync(vaultClaudeMd, "utf-8");
  } catch {
    return [];
  }

  // Extract the YAML frontmatter block (between first --- fences).
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    return extractExtensionsFromText(content);
  }
  const fm = fmMatch[1];
  return fm !== undefined ? extractExtensionsFromText(fm) : extractExtensionsFromText(content);
}

/**
 * Extract entity_type_extensions values from a text block (frontmatter or full doc).
 */
function extractExtensionsFromText(text: string): readonly string[] {
  // Flow sequence: entity_type_extensions: [dataset, model]
  const flowMatch = text.match(/entity_type_extensions\s*:\s*\[([^\]]*)\]/);
  if (flowMatch) {
    const inner = flowMatch[1];
    if (inner === undefined) return [];
    return inner
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter((s) => s.length > 0);
  }

  // Block sequence:
  //   entity_type_extensions:
  //     - dataset
  //     - model
  const lines = text.split("\n");
  let inExtensions = false;
  const values: string[] = [];
  for (const line of lines) {
    if (line === undefined) continue;
    if (/^entity_type_extensions\s*:/.test(line)) {
      inExtensions = true;
      continue;
    }
    if (inExtensions) {
      const itemMatch = line.match(/^\s+-\s+(\S+)/);
      if (itemMatch) {
        const val = itemMatch[1];
        if (val !== undefined) {
          values.push(val.replace(/^['"]|['"]$/g, ""));
        }
      } else if (line.trim() !== "" && !/^\s/.test(line)) {
        break;
      }
    }
  }
  return values;
}

// ── Main parse entry point ─────────────────────────────────────────────────────

/**
 * Parse the ontology-profile-v1 from the given schema document path.
 *
 * @param schemaPath     Path to the profile document (docs/vault-example/CLAUDE.md or vault CLAUDE.md).
 * @param vaultClaudeMd  Optional path to the target vault's CLAUDE.md for
 *                       entity_type_extensions composition. Pass undefined to
 *                       suppress extension lookup (core set only).
 *
 * Returns ParseOk on success, ParseFail with error Findings on failure.
 * Never returns a silent empty success (fail-closed, ADR-0015 Part C item 4).
 */
export function parseOntologyProfile(
  schemaPath: string,
  vaultClaudeMd: string | undefined,
): ParseResult {
  // Step 1: read the schema document.
  if (!existsSync(schemaPath)) {
    return {
      ok: false,
      errors: [
        Object.freeze({
          severity: "error" as const,
          check: "ontology",
          message: `Schema document not found: ${schemaPath}`,
          file: schemaPath,
        }),
      ],
    };
  }

  let content: string;
  try {
    content = readFileSync(schemaPath, "utf-8");
  } catch (err) {
    return {
      ok: false,
      errors: [
        Object.freeze({
          severity: "error" as const,
          check: "ontology",
          message: `Failed to read schema document: ${schemaPath} — ${String(err)}`,
          file: schemaPath,
        }),
      ],
    };
  }

  const lines = content.split("\n");

  // Step 2: parse the predicate table.
  const predicates = parsePredicateTable(lines);
  if (predicates === null || predicates.length === 0) {
    return {
      ok: false,
      errors: [
        Object.freeze({
          severity: "error" as const,
          check: "ontology",
          message: `ontology-profile-v1 predicate domain→range table not found or has no data rows in: ${schemaPath}`,
          file: schemaPath,
        }),
      ],
    };
  }

  // Step 3: parse the enum list table.
  const enumMap = parseEnumTable(lines);
  if (enumMap === null) {
    return {
      ok: false,
      errors: [
        Object.freeze({
          severity: "error" as const,
          check: "ontology",
          message: `ontology-profile-v1 enum list table not found or has no data rows in: ${schemaPath}`,
          file: schemaPath,
        }),
      ],
    };
  }

  // Step 4: extract the closed page-type enum.
  const typeEnum = enumMap.get("type");
  if (!typeEnum || typeEnum.length === 0) {
    return {
      ok: false,
      errors: [
        Object.freeze({
          severity: "error" as const,
          check: "ontology",
          message: `ontology-profile-v1 enum list table has no 'type' (page type) row in: ${schemaPath}`,
          file: schemaPath,
        }),
      ],
    };
  }

  // Step 5: extract the entity_type core enum.
  const entityTypeCore = enumMap.get("entity_type");
  if (!entityTypeCore || entityTypeCore.length === 0) {
    return {
      ok: false,
      errors: [
        Object.freeze({
          severity: "error" as const,
          check: "ontology",
          message: `ontology-profile-v1 enum list table has no 'entity_type' row in: ${schemaPath}`,
          file: schemaPath,
        }),
      ],
    };
  }

  // Step 6: compose entity_type = core ∪ per-vault extensions (at read time).
  // Extensions come from the vault's own CLAUDE.md, not from the profile doc.
  // The composition is a set union preserving core order, appending new values.
  let entityType: readonly string[] = entityTypeCore;
  if (vaultClaudeMd !== undefined) {
    const extensions = readEntityTypeExtensions(vaultClaudeMd);
    if (extensions.length > 0) {
      const coreSet = new Set(entityTypeCore);
      const newValues = extensions.filter((v) => !coreSet.has(v));
      if (newValues.length > 0) {
        entityType = Object.freeze([...entityTypeCore, ...newValues]);
      }
    }
  }

  const manifest: OntologyManifest = Object.freeze({
    enums: Object.freeze({
      type: Object.freeze([...typeEnum]),
      entity_type: Object.freeze([...entityType]),
    }),
    predicates: Object.freeze(predicates.map((p) => Object.freeze({ ...p }))),
  });

  return { ok: true, manifest };
}

// ── Report builder ─────────────────────────────────────────────────────────────

/**
 * Build an OntologyReport from a parsed manifest (clean) or from error Findings
 * (fail-closed). Flows through emit()/exitCode() per ADR-0015 N3.
 *
 * On success: report.clean = true, exitCode = 0.
 * On failure: report.clean = false, exitCode = 1 (via exitCode(report)).
 */
export function buildOntologyReport(
  manifest: OntologyManifest | undefined,
  errors?: readonly Finding[],
): OntologyReport {
  const stubManifest: OntologyManifest = Object.freeze({
    enums: Object.freeze({
      type: Object.freeze([]) as readonly string[],
      entity_type: Object.freeze([]) as readonly string[],
    }),
    predicates: Object.freeze([]) as readonly PredicateEntry[],
  });

  if (manifest === undefined || (errors !== undefined && errors.length > 0)) {
    const findings: readonly Finding[] = errors ?? [
      Object.freeze({
        severity: "error" as const,
        check: "ontology",
        message: "ontology-profile-v1 parse failed: no manifest produced",
      }),
    ];
    const base = buildReport("ontology", "", [...findings]);
    return Object.freeze({ ...base, manifest: stubManifest });
  }

  const base = buildReport("ontology", "", []);
  return Object.freeze({ ...base, manifest });
}

/**
 * Run the ontology verb: parse the profile from the given schema path (and
 * optional vault CLAUDE.md), build and return the OntologyReport.
 *
 * This is the dispatch entry called by the router (src/cli/cli.ts).
 *
 * @param options.schemaPath     Path to the profile document.
 * @param options.vaultClaudeMd  Optional vault CLAUDE.md path for entity_type_extensions.
 */
export function ontology(options: {
  readonly schemaPath: string;
  readonly vaultClaudeMd?: string;
}): OntologyReport {
  const result = parseOntologyProfile(options.schemaPath, options.vaultClaudeMd);
  if (!result.ok) {
    return buildOntologyReport(undefined, result.errors);
  }
  return buildOntologyReport(result.manifest);
}
