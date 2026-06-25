/**
 * Shared markdown table parsing primitives.
 *
 * Extracted from src/core/frontmatter-validate.ts (`rowCells`, line 88) and
 * src/core/ontology-profile.ts (`extractTableRow`, line 75) — both were
 * independently identical implementations of the same logic (DRY violation
 * S16-a / S16-b, dedup-markdown-table cluster).
 *
 * This module is the single source of truth for markdown table row parsing
 * in the engine. Both callers import from here; neither keeps a local copy.
 *
 * Dependency direction (src/core/CLAUDE.md): core → Node built-ins only.
 * No imports from commands/ or cli/.
 */

/**
 * Parse one markdown table row into an array of trimmed cell strings.
 *
 * The function handles:
 * - Lines that are not table rows (no leading `|`) → `null`.
 * - Separator rows (`| --- | :---: | ---: |`) → `null`.
 * - Data rows with or without a trailing `|` → array of trimmed strings.
 * - The trailing empty cell produced by `split("|")` on a line ending with
 *   `|` is dropped automatically.
 *
 * @param line     A single line from a markdown document.
 * @param minCells Minimum number of cells required for the result to be
 *                 considered valid. Pass `0` to accept any non-empty row.
 *                 When the parsed cell count is below `minCells`, `null` is
 *                 returned.
 * @returns        Trimmed cell strings, or `null` when the line is not a
 *                 parseable data row with at least `minCells` cells.
 */
export function parseTableRow(line: string, minCells: number): readonly string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  // Separator rows: lines that contain only `|`, `-`, `:`, and whitespace.
  if (/^\|[\s|:-]+\|?\s*$/.test(trimmed)) return null;
  const parts = trimmed.split("|");
  // slice(1) drops the leading empty string produced by the leading `|`.
  const cells = parts.slice(1).map((c) => c.trim());
  // Pop the trailing empty string produced by a trailing `|`.
  if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  if (cells.length < minCells) return null;
  return cells;
}
