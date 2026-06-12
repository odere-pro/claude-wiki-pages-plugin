import { test, expect, describe } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fix } from "./fix.ts";
import { verify } from "../verify/verify.ts";
import { makeVault } from "../../test-helpers/sandbox/vault.ts";

/** A vault whose only errors are the deterministically-fixable structural ones. */
const FIXABLE: Record<string, string> = {
  "CLAUDE.md": "---\nschema_version: 1\n---\n",
  "wiki/index.md": "---\ntitle: index\n---\n- [[Alpha]]\n- [[Alpha]]\n", // duplicate
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nbody\n", // folder has no index file
};

describe("fix", () => {
  test("repairs index duplicates, missing folder index, and children drift → errors clear", () => {
    const sb = makeVault(FIXABLE);
    expect(verify({ target: sb.vault }).errors).toBeGreaterThan(0);

    const report = fix({ target: sb.vault, today: "2026-06-01" });
    expect(report.changed).toBeGreaterThan(0);
    expect(report.changes.map((c) => c.action)).toContain("create-index");

    expect(verify({ target: sb.vault }).errors).toBe(0);
    sb.cleanup();
  });

  test("creates the FOLDER NOTE name for a missing index — never _index.md", () => {
    const sb = makeVault(FIXABLE);
    fix({ target: sb.vault, today: "2026-06-01" });

    const note = join(sb.vault, "wiki/topics/topics.md");
    expect(existsSync(note)).toBe(true);
    expect(existsSync(join(sb.vault, "wiki/topics/_index.md"))).toBe(false);
    expect(readFileSync(note, "utf8")).toContain("type: index");
    sb.cleanup();
  });

  test("never auto-renames an existing legacy _index.md (that is migrate's job)", () => {
    const sb = makeVault({
      ...FIXABLE,
      "wiki/topics/_index.md":
        '---\ntitle: Topics — Index\ntype: index\nchildren: ["[[Real Page]]"]\n---\n',
    });
    const report = fix({ target: sb.vault, today: "2026-06-01" });

    expect(existsSync(join(sb.vault, "wiki/topics/_index.md"))).toBe(true);
    expect(existsSync(join(sb.vault, "wiki/topics/topics.md"))).toBe(false);
    expect(report.changes.filter((c) => c.action === "create-index")).toHaveLength(0);
    sb.cleanup();
  });

  test("does not overwrite a same-stem regular page when creating an index", () => {
    const sb = makeVault({
      ...FIXABLE,
      // The folder-note NAME is taken by a regular page (no type: index).
      "wiki/topics/topics.md": "---\ntitle: Topics\n---\nhand-written body\n",
    });
    fix({ target: sb.vault, today: "2026-06-01" });

    expect(readFileSync(join(sb.vault, "wiki/topics/topics.md"), "utf8")).toContain(
      "hand-written body",
    );
    expect(existsSync(join(sb.vault, "wiki/topics/_index.md"))).toBe(false);
    sb.cleanup();
  });

  test("is idempotent — a second run changes nothing", () => {
    const sb = makeVault(FIXABLE);
    fix({ target: sb.vault, today: "2026-06-01" });
    const second = fix({ target: sb.vault, today: "2026-06-01" });
    expect(second.changed).toBe(0);
    sb.cleanup();
  });

  test("does not touch a clean vault", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    expect(fix({ target: sb.vault }).changed).toBe(0);
    sb.cleanup();
  });
});
