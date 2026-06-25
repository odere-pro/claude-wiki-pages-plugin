/**
 * TDD: src/core/markdown-table.ts
 *
 * Written FIRST (red) before the implementation module is created, per
 * TEAM-BRIEF §9 TDD mandate. Tests cover:
 *
 * parseTableRow():
 *  1. Returns null for a non-table line (no leading |).
 *  2. Returns null for a separator row (| --- | --- |).
 *  3. Returns null for a separator row with colons (| :--- | ---: |).
 *  4. Returns trimmed cells for a data row with enclosing pipes.
 *  5. Returns trimmed cells for a data row without trailing pipe.
 *  6. Returns null when parsed cells are fewer than minCells.
 *  7. Returns cells when count exactly meets minCells.
 *  8. minCells=0 → always non-null for a valid data row.
 *  9. Trailing empty cell (from trailing |) is dropped.
 * 10. Leading whitespace on the whole line is trimmed before checking.
 * 11. Empty string input returns null (no leading |).
 */

import { test, expect, describe } from "bun:test";
import { parseTableRow } from "./markdown-table.ts";

describe("Feature: Infrastructure › markdown table — parse table row", () => {
  test("1. non-table line (no leading pipe) → null", () => {
    expect(parseTableRow("plain text", 0)).toBeNull();
    expect(parseTableRow("  plain text", 0)).toBeNull();
  });

  test("2. standard separator row → null", () => {
    expect(parseTableRow("| --- | --- |", 0)).toBeNull();
    expect(parseTableRow("| --- | --- | --- |", 0)).toBeNull();
  });

  test("3. separator row with alignment colons → null", () => {
    expect(parseTableRow("| :--- | ---: | :---: |", 0)).toBeNull();
  });

  test("4. data row with enclosing pipes → trimmed cells array", () => {
    const cells = parseTableRow("| foo | bar | baz |", 0);
    expect(cells).toEqual(["foo", "bar", "baz"]);
  });

  test("5. data row without trailing pipe → trimmed cells array", () => {
    const cells = parseTableRow("| foo | bar | baz", 0);
    expect(cells).toEqual(["foo", "bar", "baz"]);
  });

  test("6. fewer cells than minCells → null", () => {
    expect(parseTableRow("| foo | bar |", 3)).toBeNull();
  });

  test("7. cells count exactly equals minCells → cells returned", () => {
    const cells = parseTableRow("| foo | bar |", 2);
    expect(cells).toEqual(["foo", "bar"]);
  });

  test("8. minCells=0 → non-null for any valid data row", () => {
    const cells = parseTableRow("| single |", 0);
    expect(cells).toEqual(["single"]);
  });

  test("9. trailing empty cell from trailing pipe is dropped", () => {
    // split('|') on '| a | b |' yields ['', ' a ', ' b ', '']
    // slice(1) → [' a ', ' b ', ''] — trailing '' must be popped.
    const cells = parseTableRow("| a | b |", 0);
    expect(cells).toEqual(["a", "b"]);
    expect(cells?.length).toBe(2);
  });

  test("10. leading whitespace on line is trimmed before parsing", () => {
    const cells = parseTableRow("   | foo | bar |", 0);
    expect(cells).toEqual(["foo", "bar"]);
  });

  test("11. empty string → null", () => {
    expect(parseTableRow("", 0)).toBeNull();
  });
});
