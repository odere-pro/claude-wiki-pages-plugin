import { test, expect, describe } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { heal, type VerifyFn, type FixFn } from "./heal.ts";
import { verify } from "../verify/verify.ts";
import { makeVault } from "../../test-helpers/sandbox/vault.ts";
import { DEFAULT_VAULT } from "../../core/vault.ts";

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

describe("Feature: Engine › heal verb", () => {
  const opts = { opId: "test-op", isoTime: "2026-06-01T00:00:00.000Z", today: "2026-06-01" };

  // M17 / DIP: injectable _verify and _fix dependencies allow composing heal
  // without a hard lateral coupling to the sibling command modules.
  test("accepts injected _verify and _fix and uses them throughout the loop", async () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    initRepo(sb.vault);

    const verifyCalls: string[] = [];
    const fixCalls: string[] = [];

    // Stub verify: first call says 1 error, second call says clean.
    let verifyCallCount = 0;
    const stubVerify: VerifyFn = async ({ target }) => {
      verifyCalls.push(target);
      verifyCallCount++;
      const errors = verifyCallCount === 1 ? 1 : 0;
      return {
        command: "verify",
        vault: target,
        findings:
          errors > 0 ? [{ severity: "error" as const, check: "stub", message: "stub error" }] : [],
        errors,
        warnings: 0,
        clean: errors === 0,
      };
    };

    // Stub fix: claims one change so the loop makes progress.
    const stubFix: FixFn = ({ target }) => {
      fixCalls.push(target);
      return {
        command: "fix",
        vault: target,
        changes: [{ file: "wiki/index.md", action: "dedupe-index" as const }],
        changed: 1,
      };
    };

    const report = await heal({
      target: sb.vault,
      ...opts,
      // gitCheckpoint.mode defaults to "off" in test env via env var below;
      // disable it explicitly so the stub test doesn't need a real git repo setup.
      maxIterations: 3,
      _verify: stubVerify,
      _fix: stubFix,
    });

    // The stub drove the loop to clean in one iteration.
    expect(report.clean).toBe(true);
    expect(report.errorsAfter).toBe(0);
    // Both stubs were actually called.
    expect(fixCalls.length).toBeGreaterThan(0);
    expect(verifyCalls.length).toBeGreaterThan(1); // initial + at least one re-verify
    // All calls went to the correct vault.
    for (const path of [...verifyCalls, ...fixCalls]) {
      expect(path).toBe(sb.vault);
    }

    sb.cleanup();
  });

  test("checkpoints, fixes, commits, and drives errors to zero", async () => {
    const sb = makeVault(DIRTY);
    initRepo(sb.vault);

    const report = await heal({ target: sb.vault, ...opts });

    expect(report.errorsBefore).toBeGreaterThan(0);
    expect(report.errorsAfter).toBe(0);
    expect(report.clean).toBe(true);
    expect(report.checkpoint).not.toBeNull();
    expect(report.healCommit).not.toBeNull();
    expect((await verify({ target: sb.vault })).errors).toBe(0);

    const log = gitLog(sb.vault);
    expect(log).toContain("checkpoint: claude-wiki-pages pre-heal");
    expect(log).toContain("heal: claude-wiki-pages auto-heal");
    sb.cleanup();
  });

  test("a clean vault is a no-op with no git churn", async () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    initRepo(sb.vault);
    const before = gitLog(sb.vault);

    const report = await heal({ target: sb.vault, ...opts });

    expect(report.clean).toBe(true);
    expect(report.iterations).toBe(0);
    expect(report.checkpoint).toBeNull();
    expect(gitLog(sb.vault)).toBe(before); // no new commits
    sb.cleanup();
  });

  test("gitCheckpoint.mode=off heals without any git operation", async () => {
    const sb = makeVault(DIRTY);
    initRepo(sb.vault);
    const before = gitLog(sb.vault);

    process.env["CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE"] = "off";
    try {
      const report = await heal({ target: sb.vault, ...opts });
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

  test("checkpointBranch option pins a rollback branch on top of the configured mode", async () => {
    const sb = makeVault(DIRTY);
    initRepo(sb.vault);

    const report = await heal({ target: sb.vault, ...opts, checkpointBranch: true });
    expect(report.checkpoint).not.toBeNull();
    const branches = execFileSync("git", ["branch", "--list", "cwp/checkpoint/test-op"], {
      cwd: sb.vault,
      encoding: "utf8",
    });
    expect(branches).toContain("cwp/checkpoint/test-op");
    sb.cleanup();
  });

  // Non-convergence path A: fix makes no progress (changed === 0) even though
  // errors remain. The loop must break immediately rather than spin, leave the
  // checkpoint in place, and report clean=false with unresolved populated.
  test("non-convergence: fix makes no progress — loop breaks, unresolved populated", async () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    initRepo(sb.vault);

    const stubVerify: VerifyFn = async ({ target }) => ({
      command: "verify",
      vault: target,
      findings: [{ severity: "error" as const, check: "stub", message: "unfixable error" }],
      errors: 1,
      warnings: 0,
      clean: false,
    });

    // fix always returns changed === 0 — nothing it can do.
    const stubFix: FixFn = ({ target }) => ({
      command: "fix",
      vault: target,
      changes: [],
      changed: 0,
    });

    const report = await heal({
      target: sb.vault,
      ...opts,
      maxIterations: 5,
      _verify: stubVerify,
      _fix: stubFix,
    });

    // Loop must break after the first no-progress iteration, not spin to 5.
    expect(report.clean).toBe(false);
    expect(report.errorsAfter).toBe(1);
    expect(report.iterations).toBe(1);
    // Unresolved must contain the residual error message.
    expect(report.unresolved).toHaveLength(1);
    expect(report.unresolved[0]).toBe("unfixable error");
    // Checkpoint was written (we had errors, so git setup ran).
    expect(report.checkpoint).not.toBeNull();
    // No heal commit — loop did not converge.
    expect(report.healCommit).toBeNull();

    sb.cleanup();
  });

  // Non-convergence path B: fix makes partial progress each iteration but
  // errors never reach zero before maxIterations is exhausted. The report must
  // reflect clean=false with every residual error in unresolved.
  test("non-convergence: maxIterations exhausted — unresolved reflects residual errors", async () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    initRepo(sb.vault);

    // verify always reports errors — fix never fully resolves them.
    const stubVerify: VerifyFn = async ({ target }) => ({
      command: "verify",
      vault: target,
      findings: [
        { severity: "error" as const, check: "stub-a", message: "error-alpha" },
        { severity: "error" as const, check: "stub-b", message: "error-beta" },
      ],
      errors: 2,
      warnings: 0,
      clean: false,
    });

    // fix always reports one change so the no-progress guard never fires;
    // the loop must run to maxIterations.
    let fixCallCount = 0;
    const stubFix: FixFn = ({ target }) => {
      fixCallCount++;
      return {
        command: "fix",
        vault: target,
        changes: [{ file: "wiki/index.md", action: "dedupe-index" as const }],
        changed: 1,
      };
    };

    const maxIterations = 3;
    const report = await heal({
      target: sb.vault,
      ...opts,
      maxIterations,
      _verify: stubVerify,
      _fix: stubFix,
    });

    expect(report.clean).toBe(false);
    expect(report.errorsAfter).toBe(2);
    // Loop ran exactly maxIterations times.
    expect(report.iterations).toBe(maxIterations);
    expect(fixCallCount).toBe(maxIterations);
    // Both residual error messages surface in unresolved.
    expect(report.unresolved).toHaveLength(2);
    expect(report.unresolved).toContain("error-alpha");
    expect(report.unresolved).toContain("error-beta");
    // Checkpoint exists; no heal commit because we never converged.
    expect(report.checkpoint).not.toBeNull();
    expect(report.healCommit).toBeNull();

    sb.cleanup();
  });

  // No-vault path: when no `target` is given, heal must call resolveVault internally
  // and pass the resolved path through to the injected stubs — it must NOT throw or
  // bypass resolution. A cwd with no vault markers falls through to tier-4 (DEFAULT_VAULT).
  test("no-vault path: omitting target resolves vault via resolveVault and passes it to stubs", async () => {
    // An empty tmp dir has no CLAUDE.md, no settings file — so resolveVault falls
    // through to tier 4: DEFAULT_VAULT ("docs/vault"), provided env overrides are absent.
    const cwd = mkdtempSync(join(tmpdir(), "cwp-novault-"));
    // resolveVault returns DEFAULT_VAULT as a bare relative string when all four tiers miss;
    // heal.ts strips trailing slashes but does not absolutise it.
    const expectedVault = DEFAULT_VAULT.replace(/\/+$/, "");

    let capturedVault: string | undefined = undefined;

    // Stub verify: immediately reports clean so the loop exits without git ops.
    const stubVerify: VerifyFn = async ({ target }) => {
      capturedVault = target;
      return {
        command: "verify",
        vault: target,
        findings: [],
        errors: 0,
        warnings: 0,
        clean: true,
      };
    };

    // Stub fix: should not be called on an already-clean vault.
    const stubFix: FixFn = ({ target }) => ({
      command: "fix",
      vault: target,
      changes: [],
      changed: 0,
    });

    // Temporarily clear env overrides that would short-circuit tier-4 resolution,
    // mirroring the pattern used by the gitCheckpoint.mode=off test above.
    const savedVault = process.env["CLAUDE_WIKI_PAGES_VAULT"];
    const savedLegacy = process.env["LLM_WIKI_VAULT"];
    delete process.env["CLAUDE_WIKI_PAGES_VAULT"];
    delete process.env["LLM_WIKI_VAULT"];
    try {
      const report = await heal({
        // No `target` — exercises the resolveVault({ cwd }) branch in heal.ts line 96.
        cwd,
        ...opts,
        _verify: stubVerify,
        _fix: stubFix,
      });

      // The vault passed to stubs must be the tier-4 default, not undefined or the
      // process cwd — confirming resolveVault ran and its result flowed through.
      expect(capturedVault).toBeDefined();
      expect(capturedVault!).toBe(expectedVault);
      // A clean vault is a no-op: iterations = 0, no checkpoint, no heal commit.
      expect(report.vault).toBe(expectedVault);
      expect(report.clean).toBe(true);
      expect(report.iterations).toBe(0);
      expect(report.checkpoint).toBeNull();
      expect(report.healCommit).toBeNull();
    } finally {
      if (savedVault !== undefined) process.env["CLAUDE_WIKI_PAGES_VAULT"] = savedVault;
      if (savedLegacy !== undefined) process.env["LLM_WIKI_VAULT"] = savedLegacy;
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
