import { test, expect, describe, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { snapshot } from "./snapshot.ts";
import { makeVault, CLEAN_VAULT } from "../../test-helpers/sandbox/vault.ts";

function initRepo(dir: string): void {
  const run = (args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  run(["init"]);
  run(["config", "user.email", "t@e.com"]);
  run(["config", "user.name", "T"]);
  run(["config", "commit.gpgsign", "false"]);
  run(["add", "-A"]);
  run(["commit", "--no-verify", "-m", "init"]);
}

function gitLog(dir: string): string {
  return execFileSync("git", ["log", "--oneline"], { cwd: dir, encoding: "utf8" });
}

const opts = { opId: "snap-test", isoTime: "2026-06-11T00:00:00.000Z" };

afterEach(() => {
  delete process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"];
});

describe("Feature: Engine › snapshot verb — pre", () => {
  test("writes a checkpoint commit and reports its SHA", () => {
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);

    const report = snapshot({ sub: "pre", target: sb.vault, ...opts });
    expect(report.skipped).toBe(false);
    expect(report.sha).not.toBeNull();
    expect(gitLog(sb.vault)).toContain("checkpoint: claude-wiki-pages pre-heal");
    sb.cleanup();
  });

  test("mode=branch creates a cwp/checkpoint branch AND a checkpoint commit", () => {
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"] = "branch";

    const report = snapshot({ sub: "pre", target: sb.vault, ...opts });
    expect(report.skipped).toBe(false);
    expect(report.sha).not.toBeNull();
    expect(report.mode).toBe("branch");
    // The checkpoint branch must exist and point at the same SHA the report returns.
    const branches = execFileSync("git", ["branch", "--list", "cwp/checkpoint/*"], {
      cwd: sb.vault,
      encoding: "utf8",
    });
    expect(branches.trim()).not.toBe("");
    expect(branches).toContain(`cwp/checkpoint/${opts.opId}`);
    expect(gitLog(sb.vault)).toContain("checkpoint: claude-wiki-pages pre-heal");
    sb.cleanup();
  });

  test("mode=both creates a cwp/checkpoint branch AND a checkpoint commit", () => {
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"] = "both";

    const report = snapshot({ sub: "pre", target: sb.vault, ...opts });
    expect(report.skipped).toBe(false);
    expect(report.sha).not.toBeNull();
    expect(report.mode).toBe("both");
    const branches = execFileSync("git", ["branch", "--list", "cwp/checkpoint/*"], {
      cwd: sb.vault,
      encoding: "utf8",
    });
    expect(branches.trim()).not.toBe("");
    expect(branches).toContain(`cwp/checkpoint/${opts.opId}`);
    expect(gitLog(sb.vault)).toContain("checkpoint: claude-wiki-pages pre-heal");
    sb.cleanup();
  });

  test("creates the repo when the vault is not under git yet", () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = snapshot({ sub: "pre", target: sb.vault, ...opts });
    expect(report.sha).not.toBeNull();
    expect(gitLog(sb.vault)).toContain("initial vault commit");
    sb.cleanup();
  });

  test("mode=off is a no-op", () => {
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    const before = gitLog(sb.vault);
    process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"] = "off";

    const report = snapshot({ sub: "pre", target: sb.vault, ...opts });
    expect(report.skipped).toBe(true);
    expect(report.reason).toBe("gitCheckpoint.mode=off");
    expect(gitLog(sb.vault)).toBe(before);
    sb.cleanup();
  });
});

describe("Feature: Engine › snapshot verb — post — degraded path (no prior pre)", () => {
  test("post with vanished repo: ensureRepo re-inits and vault is clean → skip", () => {
    // Negative case: the repo was initialised (snapshot pre ran) and files were
    // written during the LLM phase, but then the .git directory was removed
    // (corrupted / accidentally deleted — the degraded path in snapshot.ts
    // lines 83-87). ensureRepo re-inits and commits ALL existing files as the
    // initial vault commit, leaving the vault clean. snapshot post must then skip
    // (reason=clean, sha=null) rather than crash or produce an empty commit.
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    // Write a new page during the (simulated) LLM write phase.
    writeFileSync(join(sb.vault, "wiki", "recovery.md"), "---\ntitle: R\n---\n");
    // Simulate repo corruption: remove .git so isRepo() returns false.
    rmSync(join(sb.vault, ".git"), { recursive: true, force: true });

    const report = snapshot({ sub: "post", target: sb.vault, label: "recovery", ...opts });

    // ensureRepo commits all existing files (including recovery.md) as the
    // initial vault commit, so the vault is clean when isClean() is checked.
    expect(report.skipped).toBe(true);
    expect(report.reason).toBe("clean");
    expect(report.sha).toBeNull();
    // The re-init must have produced an initial vault commit (ensureRepo ran).
    const log = execFileSync("git", ["log", "--oneline"], {
      cwd: sb.vault,
      encoding: "utf8",
    });
    expect(log).toContain("initial vault commit");
    sb.cleanup();
  });

  test("post without prior pre on clean vault: skips with reason=clean", () => {
    // Negative case: degraded path + clean vault. ensureRepo initialises the repo
    // and commits the initial vault state; the vault is then clean, so post must
    // skip (no empty commit) with reason='clean'. sha must be null.
    const sb = makeVault(CLEAN_VAULT);
    // No initRepo — ensureRepo will create and commit the initial vault state.
    // After ensureRepo the vault becomes clean, so post should skip.

    const report = snapshot({ sub: "post", target: sb.vault, ...opts });

    expect(report.skipped).toBe(true);
    expect(report.reason).toBe("clean");
    expect(report.sha).toBeNull();
    sb.cleanup();
  });
});

describe("Feature: Engine › snapshot verb — post", () => {
  test("commits the write phase with the label and opId in the message", () => {
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    writeFileSync(join(sb.vault, "wiki", "new-page.md"), "---\ntitle: New\n---\n");

    const preState = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: sb.vault,
      encoding: "utf8",
    }).trim();
    const report = snapshot({ sub: "post", target: sb.vault, label: "ingest alpha", ...opts });
    expect(report.skipped).toBe(false);
    expect(report.sha).not.toBeNull();
    const msg = execFileSync("git", ["log", "-1", "--pretty=%s"], {
      cwd: sb.vault,
      encoding: "utf8",
    });
    expect(msg).toContain("snapshot: ingest alpha snap-test");

    // Paper trace: log entry with the pre-state SHA, committed INSIDE the
    // snapshot commit (the working tree is clean afterwards).
    const log = readFileSync(join(sb.vault, "wiki", "log.md"), "utf8");
    expect(log).toContain("snapshot | ingest alpha (snap-test)");
    expect(log).toContain(`pre-state: ${preState}`);
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: sb.vault,
      encoding: "utf8",
    });
    expect(status).toBe("");
    sb.cleanup();
  });

  test("a clean vault skips with reason=clean (no empty commit)", () => {
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    const before = gitLog(sb.vault);

    const report = snapshot({ sub: "post", target: sb.vault, ...opts });
    expect(report.skipped).toBe(true);
    expect(report.reason).toBe("clean");
    expect(gitLog(sb.vault)).toBe(before);
    sb.cleanup();
  });

  test("mode=off never commits even with a dirty vault", () => {
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    writeFileSync(join(sb.vault, "wiki", "dirty.md"), "x");
    const before = gitLog(sb.vault);
    process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"] = "off";

    const report = snapshot({ sub: "post", target: sb.vault, ...opts });
    expect(report.skipped).toBe(true);
    expect(gitLog(sb.vault)).toBe(before);
    sb.cleanup();
  });

  test("inherited parent repo: commits only vault files, user dirt survives", () => {
    const sb = makeVault({ ...CLEAN_VAULT }, { nest: "docs/vault" });
    initRepo(sb.root);
    writeFileSync(join(sb.root, "user-wip.ts"), "unrelated");
    mkdirSync(join(sb.vault, "wiki"), { recursive: true });
    writeFileSync(join(sb.vault, "wiki", "page.md"), "---\ntitle: P\n---\n");

    const report = snapshot({ sub: "post", target: sb.vault, label: "polish", ...opts });
    expect(report.sha).not.toBeNull();

    const committed = execFileSync("git", ["show", "--name-only", "--pretty=format:"], {
      cwd: sb.root,
      encoding: "utf8",
    });
    expect(committed).toContain("docs/vault/wiki/page.md");
    expect(committed).not.toContain("user-wip.ts");
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: sb.root,
      encoding: "utf8",
    });
    expect(status).toContain("?? user-wip.ts");
    sb.cleanup();
  });
});

// ── Advisory vault lock — observable outcomes (H08 concurrency cluster) ─────
//
// The H08 locking contract is that the isClean→appendLog→commit sequence is
// serialized per vault. Tests here verify the OBSERVABLE outcomes of that
// contract (SnapshotReport fields + git state) rather than spying on the
// internal withVaultLockSync implementation detail.

describe("Feature: Engine › snapshot verb — post — serialization observable outcomes (H08)", () => {
  test("snapshot post with dirty vault commits and returns a non-null sha", () => {
    // Observable: a dirty vault must produce a committed sha — the whole
    // isClean→appendLog→commit sequence completed atomically.
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    writeFileSync(join(sb.vault, "wiki", "new.md"), "---\ntitle: N\n---\n");

    const report = snapshot({ sub: "post", target: sb.vault, label: "test-lock", ...opts });

    expect(report.skipped).toBe(false);
    expect(report.sha).not.toBeNull();
    // The vault must be clean after the commit (no partial writes left).
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: sb.vault,
      encoding: "utf8",
    });
    expect(status).toBe("");

    sb.cleanup();
  });

  test("snapshot post mode=off skips without touching git (no commit produced)", () => {
    // Observable: when mode=off the report is skipped and no new commit appears.
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    writeFileSync(join(sb.vault, "wiki", "dirty.md"), "x");
    const before = gitLog(sb.vault);

    process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"] = "off";
    const report = snapshot({ sub: "post", target: sb.vault, ...opts });

    expect(report.skipped).toBe(true);
    expect(report.reason).toBe("gitCheckpoint.mode=off");
    expect(report.sha).toBeNull();
    expect(gitLog(sb.vault)).toBe(before);

    delete process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"];
    sb.cleanup();
  });

  test("snapshot post on a clean vault skips with reason=clean and no new commit (TOCTOU guard)", () => {
    // Observable: the cleanliness check and the (absent) commit are treated as
    // one atomic unit — a clean vault always produces reason:'clean' with no new
    // commit, regardless of concurrent callers.
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    // Vault is clean after init — no new files written.
    const before = gitLog(sb.vault);

    const report = snapshot({ sub: "post", target: sb.vault, ...opts });

    expect(report.skipped).toBe(true);
    expect(report.reason).toBe("clean");
    expect(report.sha).toBeNull();
    // No new commit must have appeared — clean skip is truly a no-op.
    expect(gitLog(sb.vault)).toBe(before);

    sb.cleanup();
  });
});
