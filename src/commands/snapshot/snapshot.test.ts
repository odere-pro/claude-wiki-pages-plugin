import { test, expect, describe, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
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

describe("snapshot pre", () => {
  test("writes a checkpoint commit and reports its SHA", () => {
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);

    const report = snapshot({ sub: "pre", target: sb.vault, ...opts });
    expect(report.skipped).toBe(false);
    expect(report.sha).not.toBeNull();
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

describe("snapshot post", () => {
  test("commits the write phase with the label and opId in the message", () => {
    const sb = makeVault(CLEAN_VAULT);
    initRepo(sb.vault);
    writeFileSync(join(sb.vault, "wiki", "new-page.md"), "---\ntitle: New\n---\n");

    const report = snapshot({ sub: "post", target: sb.vault, label: "ingest alpha", ...opts });
    expect(report.skipped).toBe(false);
    expect(report.sha).not.toBeNull();
    const msg = execFileSync("git", ["log", "-1", "--pretty=%s"], {
      cwd: sb.vault,
      encoding: "utf8",
    });
    expect(msg).toContain("snapshot: ingest alpha snap-test");
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
