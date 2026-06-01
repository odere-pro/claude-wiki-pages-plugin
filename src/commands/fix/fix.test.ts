import { test, expect, describe } from "bun:test";
import { fix } from "./fix.ts";
import { verify } from "../verify/verify.ts";
import { makeVault } from "../../test-helpers/sandbox/vault.ts";

/** A vault whose only errors are the deterministically-fixable structural ones. */
const FIXABLE: Record<string, string> = {
  "CLAUDE.md": "---\nschema_version: 1\n---\n",
  "wiki/index.md": "---\ntitle: index\n---\n- [[Alpha]]\n- [[Alpha]]\n", // duplicate
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nbody\n", // folder has no _index.md
};

describe("fix", () => {
  test("repairs index duplicates, missing _index, and children drift → errors clear", () => {
    const sb = makeVault(FIXABLE);
    expect(verify({ target: sb.vault }).errors).toBeGreaterThan(0);

    const report = fix({ target: sb.vault, today: "2026-06-01" });
    expect(report.changed).toBeGreaterThan(0);
    expect(report.changes.map((c) => c.action)).toContain("create-index");

    expect(verify({ target: sb.vault }).errors).toBe(0);
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
