import { test, expect, describe } from "bun:test";
import {
  existsSync,
  readFileSync,
  chmodSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

// ── Negative / error-path tests (A03) ─────────────────────────────────────────
//
// fix is a best-effort repair: it must never throw on bad input (no wiki/,
// non-existent vault path). Permission errors on write are propagated as-thrown
// by Node — fix does not swallow I/O failures (the fix.ts CLAUDE.md contract
// says "bounded on purpose"; judgment is left to curator/human; silent swallow
// would hide corruption). These tests pin the exact boundary:
//   - no wiki/ → empty report, no throw
//   - vault path does not exist → empty report, no throw
//   - unreadable file → graceful skip (readFileSafe returns null)
//   - read-only index.md → throws (Node EACCES); callers own the guard
describe("fix — negative / error paths", () => {
  test("returns empty report when the vault has no wiki/ directory", () => {
    // A target with a CLAUDE.md but no wiki/ dir — fix should be a no-op.
    const sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const report = fix({ target: sb.vault });
    expect(report.changed).toBe(0);
    expect(report.changes).toHaveLength(0);
    sb.cleanup();
  });

  test("returns empty report when the vault path does not exist", () => {
    // A completely non-existent path should not throw — existsSync returns false,
    // the wiki guard fires, and fix returns an empty report.
    const nonExistent = join(tmpdir(), `cwp-nonexistent-${Date.now()}`);
    const report = fix({ target: nonExistent });
    expect(report.changed).toBe(0);
    expect(report.changes).toHaveLength(0);
  });

  test("skips an unreadable page (ENOENT / null from readFileSafe)", () => {
    // readFileSafe returns null for any unreadable file; fix must not throw and
    // must not record a change for a page it could not read.
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/real.md": "---\ntitle: Real\n---\nbody\n",
    });
    // Remove the page after the vault is materialised; fix must not throw.
    rmSync(join(sb.vault, "wiki/topics/real.md"));
    // fix should still complete (no throw), even with the missing file.
    expect(() => fix({ target: sb.vault })).not.toThrow();
    sb.cleanup();
  });

  test("propagates EACCES when index.md is read-only (permission error is loud, not silent)", () => {
    // fix intentionally does NOT swallow write errors — a permission failure must
    // surface so callers know the repair did not complete. This pins that contract:
    // if writeFileSync fails, fix throws rather than silently reporting changed=0.
    // Skip this test on platforms where chmod 0o444 doesn't apply (e.g., root user).
    const isRoot = process.getuid?.() === 0;
    if (isRoot) return; // root bypasses chmod restrictions

    const root = mkdtempSync(join(tmpdir(), "cwp-perms-"));
    const vault = join(root, "vault");
    const wikiDir = join(vault, "wiki");
    mkdirSync(wikiDir, { recursive: true });
    // Write an index with duplicates, then make it read-only.
    const indexPath = join(wikiDir, "index.md");
    writeFileSync(indexPath, "---\ntitle: index\n---\n- [[Alpha]]\n- [[Alpha]]\n");
    writeFileSync(join(vault, "CLAUDE.md"), "---\nschema_version: 1\n---\n");
    chmodSync(indexPath, 0o444); // read-only

    try {
      expect(() => fix({ target: vault })).toThrow();
    } finally {
      // Restore permissions before cleanup so rmSync can delete the file.
      chmodSync(indexPath, 0o644);
      rmSync(root, { recursive: true, force: true });
    }
  });
});
