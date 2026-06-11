import { test, expect, describe } from "bun:test";
import { execFileSync } from "node:child_process";
import { heal } from "./heal.ts";
import { verify } from "../verify/verify.ts";
import { makeVault } from "../../test-helpers/sandbox/vault.ts";

function initRepo(dir: string): void {
  const run = (args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  run(["init"]);
  run(["config", "user.email", "t@e.com"]);
  run(["config", "user.name", "T"]);
  run(["config", "commit.gpgsign", "false"]);
  run(["add", "-A"]);
  run(["commit", "--no-verify", "-m", "init"]);
}

const DIRTY: Record<string, string> = {
  "CLAUDE.md": "---\nschema_version: 1\n---\n",
  "wiki/index.md": "---\ntitle: index\n---\n- [[Alpha]]\n- [[Alpha]]\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nbody\n",
};

function gitLog(dir: string): string {
  return execFileSync("git", ["log", "--oneline"], { cwd: dir, encoding: "utf8" });
}

describe("heal", () => {
  const opts = { opId: "test-op", isoTime: "2026-06-01T00:00:00.000Z", today: "2026-06-01" };

  test("checkpoints, fixes, commits, and drives errors to zero", () => {
    const sb = makeVault(DIRTY);
    initRepo(sb.vault);

    const report = heal({ target: sb.vault, ...opts });

    expect(report.errorsBefore).toBeGreaterThan(0);
    expect(report.errorsAfter).toBe(0);
    expect(report.clean).toBe(true);
    expect(report.checkpoint).not.toBeNull();
    expect(report.healCommit).not.toBeNull();
    expect(verify({ target: sb.vault }).errors).toBe(0);

    const log = gitLog(sb.vault);
    expect(log).toContain("checkpoint: claude-wiki-pages pre-heal");
    expect(log).toContain("heal: claude-wiki-pages auto-heal");
    sb.cleanup();
  });

  test("a clean vault is a no-op with no git churn", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    initRepo(sb.vault);
    const before = gitLog(sb.vault);

    const report = heal({ target: sb.vault, ...opts });

    expect(report.clean).toBe(true);
    expect(report.iterations).toBe(0);
    expect(report.checkpoint).toBeNull();
    expect(gitLog(sb.vault)).toBe(before); // no new commits
    sb.cleanup();
  });

  test("gitCheckpoint.mode=off heals without any git operation", () => {
    const sb = makeVault(DIRTY);
    initRepo(sb.vault);
    const before = gitLog(sb.vault);

    process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"] = "off";
    try {
      const report = heal({ target: sb.vault, ...opts });
      expect(report.clean).toBe(true);
      expect(report.errorsAfter).toBe(0);
      expect(report.checkpoint).toBeNull();
      expect(report.healCommit).toBeNull();
      expect(gitLog(sb.vault)).toBe(before); // fixes applied, nothing committed
    } finally {
      delete process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"];
    }
    sb.cleanup();
  });

  test("checkpointBranch option pins a rollback branch on top of the configured mode", () => {
    const sb = makeVault(DIRTY);
    initRepo(sb.vault);

    const report = heal({ target: sb.vault, ...opts, checkpointBranch: true });
    expect(report.checkpoint).not.toBeNull();
    const branches = execFileSync("git", ["branch", "--list", "cwp/checkpoint/test-op"], {
      cwd: sb.vault,
      encoding: "utf8",
    });
    expect(branches).toContain("cwp/checkpoint/test-op");
    sb.cleanup();
  });
});
