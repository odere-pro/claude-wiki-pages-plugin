import { test, expect, describe } from "bun:test";
import { backlog } from "./backlog.ts";
import { makeVault } from "../../test-helpers/sandbox/vault.ts";

describe("backlog", () => {
  test("fallback: raw files without a _sources summary are pending", () => {
    const sb = makeVault({
      "wiki/log.md":
        "---\ntitle: log\n---\n\n## [2026-05-20] ingest | Foo\n\n## [2026-05-21] lint | Health check\n",
      "wiki/_sources/foo.md": "---\ntitle: Foo\ntype: source\n---\n", // foo processed
      "raw/foo.md": "x",
      "raw/bar.md": "y", // no summary → pending
    });
    const r = backlog({ target: sb.vault, today: "2026-05-22" });
    expect(r.pendingRaw).toEqual(["raw/bar.md"]);
    expect(r.lastIngest).toBe("2026-05-20");
    expect(r.lastLint).toBe("2026-05-21");
    expect(r.daysSinceLint).toBe(1);
    expect(r.needsCatchup).toBe(true); // bar.md pending
    sb.cleanup();
  });

  test("manifest is preferred over log-scan when present", () => {
    const sb = makeVault({
      "wiki/log.md": "---\ntitle: log\n---\n\n## [2026-05-21] lint | ok\n",
      "wiki/_sources/manifest.md":
        "---\ntype: manifest\n---\n\n| raw_file | status | source_page | checksum | ingested_at |\n| --- | --- | --- | --- | --- |\n| raw/a.md | processed | [[A]] | abc | 2026-05-20 |\n| raw/b.md | pending | — | def | — |\n",
      "raw/a.md": "x",
      "raw/b.md": "y",
    });
    const r = backlog({ target: sb.vault, today: "2026-05-22" });
    expect(r.pendingRaw).toEqual(["raw/b.md"]);
    sb.cleanup();
  });

  test("lint staleness alone triggers catch-up", () => {
    const sb = makeVault({
      "wiki/log.md":
        "---\ntitle: log\n---\n\n## [2026-05-01] ingest | Foo\n\n## [2026-05-01] lint | ok\n",
      "wiki/_sources/foo.md": "---\ntitle: Foo\ntype: source\n---\n",
      "raw/foo.md": "x", // processed
    });
    const r = backlog({ target: sb.vault, today: "2026-05-20", lintEveryDays: 7 });
    expect(r.pendingRaw).toHaveLength(0);
    expect(r.daysSinceLint).toBe(19);
    expect(r.needsCatchup).toBe(true); // stale lint
    sb.cleanup();
  });

  test("clean, recently-linted vault needs no catch-up", () => {
    const sb = makeVault({
      "wiki/log.md":
        "---\ntitle: log\n---\n\n## [2026-05-20] ingest | Foo\n\n## [2026-05-21] lint | ok\n",
      "wiki/_sources/foo.md": "---\ntitle: Foo\ntype: source\n---\n",
      "raw/foo.md": "x",
    });
    const r = backlog({ target: sb.vault, today: "2026-05-22", lintEveryDays: 7 });
    expect(r.needsCatchup).toBe(false);
    sb.cleanup();
  });
});
