import { test, expect, describe } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { migrate } from "./migrate.ts";
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

const V1: Record<string, string> = {
  "CLAUDE.md": "# Schema\n\n`schema_version: 1`\n",
  "wiki/index.md": "---\ntitle: index\n---\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/_sources/foo.md": "---\ntitle: Foo\ntype: source\n---\n",
  "raw/foo.md": "raw content for foo\n",
  "raw/unprocessed.md": "not yet ingested\n",
};

const opts = { opId: "test-mig", isoTime: "2026-06-02T00:00:00.000Z", today: "2026-06-02" };

describe("migrate", () => {
  test("dry-run reports a plan without writing", () => {
    const sb = makeVault(V1);
    const before = readFileSync(join(sb.vault, "CLAUDE.md"), "utf8");

    const r = migrate({ target: sb.vault, ...opts });

    expect(r.from).toBe(1);
    expect(r.to).toBe(2);
    expect(r.applied).toBe(false);
    expect(r.changes.some((c) => c.action === "bump-schema")).toBe(true);
    expect(r.changes.some((c) => c.action === "generate-manifest")).toBe(true);
    // nothing on disk changed
    expect(readFileSync(join(sb.vault, "CLAUDE.md"), "utf8")).toBe(before);
    expect(existsSync(join(sb.vault, "wiki/_sources/manifest.md"))).toBe(false);
    sb.cleanup();
  });

  test("--write bumps schema, writes templates + manifest under a checkpoint", () => {
    const sb = makeVault(V1);
    initRepo(sb.vault);

    const r = migrate({ target: sb.vault, write: true, ...opts });

    expect(r.applied).toBe(true);
    expect(r.checkpoint).not.toBeNull();
    expect(readFileSync(join(sb.vault, "CLAUDE.md"), "utf8")).toContain("schema_version: 2");
    expect(existsSync(join(sb.vault, "_templates/topic.md"))).toBe(true);
    expect(existsSync(join(sb.vault, "_templates/project.md"))).toBe(true);

    const manifest = readFileSync(join(sb.vault, "wiki/_sources/manifest.md"), "utf8");
    expect(manifest).toContain("type: manifest");
    expect(manifest).toContain("| raw/foo.md | processed | [[Foo]] |"); // stem match
    expect(manifest).toContain("| raw/unprocessed.md | pending | — |");

    // vault still verifies clean under v2
    expect(verify({ target: sb.vault }).errors).toBe(0);

    const log = execFileSync("git", ["log", "--oneline"], { cwd: sb.vault, encoding: "utf8" });
    expect(log).toContain("checkpoint: claude-wiki-pages pre-heal");
    sb.cleanup();
  });

  test("re-running on a current vault is a no-op", () => {
    const sb = makeVault(V1);
    initRepo(sb.vault);
    migrate({ target: sb.vault, write: true, ...opts });

    const second = migrate({ target: sb.vault, write: true, ...opts });

    expect(second.applied).toBe(false);
    expect(second.changes).toHaveLength(0);
    expect(second.message).toContain("Already at schema_version 2");
    sb.cleanup();
  });
});
