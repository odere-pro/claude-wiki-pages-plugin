import { test, expect, describe, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
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

  test("nested wired sources under raw/wired/<name>/ are pending (recursive scan)", () => {
    // Regression: wired project docs land nested at raw/wired/<name>/<relpath>.
    // A top-level glob (raw/*.md) would miss them; backlog must recurse.
    const sb = makeVault({
      "wiki/log.md": "---\ntitle: log\n---\n",
      "raw/top.md": "x", // top-level, unprocessed
      "raw/wired/proj/README.md": "a",
      "raw/wired/proj/docs/architecture.md": "b",
      "raw/wired/proj/docs/guide.md": "c",
      "raw/assets/diagram.md": "ignored", // assets/ excluded even when nested
    });
    const r = backlog({ target: sb.vault, today: "2026-05-22" });
    expect(r.pendingRaw).toEqual([
      "raw/top.md",
      "raw/wired/proj/README.md",
      "raw/wired/proj/docs/architecture.md",
      "raw/wired/proj/docs/guide.md",
    ]);
    expect(r.pendingRaw).not.toContain("raw/assets/diagram.md");
    expect(r.needsCatchup).toBe(true);
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

  test("wiredChanges is null when no wired sources are registered", () => {
    const sb = makeVault({ "wiki/log.md": "---\ntitle: log\n---\n" });
    const r = backlog({ target: sb.vault, cwd: sb.root, today: "2026-06-12" });
    expect(r.wiredChanges).toBeNull();
    sb.cleanup();
  });
});

describe("backlog — wired sources", () => {
  afterEach(() => {
    delete process.env["CLAUDE_WIKI_PAGES_SETTINGS_FILE"];
  });

  function gitC(repo: string, ...args: string[]): void {
    execFileSync(
      "git",
      [
        "-C",
        repo,
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@t",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { stdio: "ignore" },
    );
  }

  test("counts changed docs since lastSyncedCommit, glob-filtered; never flips needsCatchup", () => {
    const sb = makeVault(
      { "wiki/log.md": "---\ntitle: log\n---\n\n## [2026-06-11] lint | ok\n" },
      { nest: "docs/vault" },
    );
    // The project repo wraps the vault; README + a source file at the root.
    writeFileSync(join(sb.root, "README.md"), "# project\n");
    mkdirSync(join(sb.root, "src"), { recursive: true });
    writeFileSync(join(sb.root, "src", "app.ts"), "code\n");
    gitC(sb.root, "init");
    gitC(sb.root, "add", "-A");
    gitC(sb.root, "commit", "-qm", "init", "--no-verify");
    const synced = execFileSync("git", ["-C", sb.root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    // Upstream change after the sync point: one doc, one source file.
    appendFileSync(join(sb.root, "README.md"), "\nmore docs\n");
    appendFileSync(join(sb.root, "src", "app.ts"), "more code\n");
    gitC(sb.root, "add", "-A");
    gitC(sb.root, "commit", "-qm", "change", "--no-verify");

    const settings = join(sb.root, "settings.json");
    writeFileSync(
      settings,
      JSON.stringify({
        wired_sources: [
          {
            name: "proj",
            path: sb.root,
            vault: sb.vault,
            include: ["README*", "*.md", "docs/**"],
            exclude: ["docs/vault/**", "node_modules/**", ".git/**"],
            lastSyncedCommit: synced,
            lastSyncedAt: "2026-06-11T00:00:00Z",
          },
        ],
      }),
    );
    process.env["CLAUDE_WIKI_PAGES_SETTINGS_FILE"] = settings;

    const r = backlog({ target: sb.vault, cwd: sb.root, today: "2026-06-12" });
    expect(r.wiredChanges).toEqual([{ name: "proj", changed: 1 }]); // README only
    expect(r.needsCatchup).toBe(false); // wired changes are informational
    sb.cleanup();
  });
});
