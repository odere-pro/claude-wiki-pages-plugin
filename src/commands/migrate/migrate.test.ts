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
    expect(r.to).toBe(3);
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
    expect(readFileSync(join(sb.vault, "CLAUDE.md"), "utf8")).toContain("schema_version: 3");
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
    expect(second.message).toContain("Already at schema_version 3");
    sb.cleanup();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // v2 → v3: rename-index (folder notes) + wikilink rewrite
  // ──────────────────────────────────────────────────────────────────────────

  const V2: Record<string, string> = {
    "CLAUDE.md": "# Schema\n\n`schema_version: 2`\n",
    "wiki/index.md":
      "---\ntitle: index\n---\n- [[Topics — Index]]\n- [[Real Page]]\n\nSee [[topics/_index|Topics]].\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/topics/_index.md":
      '---\ntitle: "Topics — Index"\ntype: index\nchildren: ["[[Real Page]]"]\n---\nSelf: [[_index]].\n',
    "wiki/topics/real-page.md":
      "---\ntitle: Real Page\nsources: []\n---\nUp: [[topics/_index]] and labelled [[topics/_index|the index]].\n",
    "_templates/topic.md": "stub",
    "_templates/project.md": "stub",
  };

  test("v2→v3 --write renames _index.md to the folder note and rewrites wikilinks", () => {
    const sb = makeVault(V2);
    initRepo(sb.vault);

    const r = migrate({ target: sb.vault, write: true, ...opts });

    expect(r.applied).toBe(true);
    expect(r.changes.some((c) => c.action === "rename-index")).toBe(true);
    expect(r.changes.some((c) => c.action === "rewrite-links")).toBe(true);
    expect(readFileSync(join(sb.vault, "CLAUDE.md"), "utf8")).toContain("schema_version: 3");

    // Rename happened.
    expect(existsSync(join(sb.vault, "wiki/topics/_index.md"))).toBe(false);
    expect(existsSync(join(sb.vault, "wiki/topics/topics.md"))).toBe(true);

    // Link rewrites: path form, labelled form, and the bare [[_index]] self-link.
    const index = readFileSync(join(sb.vault, "wiki/index.md"), "utf8");
    expect(index).toContain("[[topics/topics|Topics]]");
    expect(index).not.toContain("_index");
    const page = readFileSync(join(sb.vault, "wiki/topics/real-page.md"), "utf8");
    expect(page).toContain("[[topics/topics]]");
    expect(page).toContain("[[topics/topics|the index]]");
    const note = readFileSync(join(sb.vault, "wiki/topics/topics.md"), "utf8");
    expect(note).toContain("[[topics]]");
    expect(note).not.toContain("[[_index]]");
    sb.cleanup();
  });

  test("v2→v3 rerun is a no-op (idempotent)", () => {
    const sb = makeVault(V2);
    initRepo(sb.vault);
    migrate({ target: sb.vault, write: true, ...opts });

    const second = migrate({ target: sb.vault, write: true, ...opts });

    expect(second.applied).toBe(false);
    expect(second.changes).toHaveLength(0);
    expect(second.message).toContain("Already at schema_version 3");
    sb.cleanup();
  });

  test("v2→v3 reports and skips a rename whose target filename already exists", () => {
    const sb = makeVault({
      ...V2,
      // The folder-note name is already taken by a regular page — conflict.
      "wiki/topics/topics.md": "---\ntitle: Topics\n---\nhand-written body\n",
    });
    initRepo(sb.vault);

    const r = migrate({ target: sb.vault, write: true, ...opts });

    // Schema still bumps; the conflicting rename is skipped and reported.
    expect(r.applied).toBe(true);
    expect(r.changes.filter((c) => c.action === "rename-index")).toHaveLength(0);
    expect(r.message).toContain("Skipped 1 rename(s)");
    expect(existsSync(join(sb.vault, "wiki/topics/_index.md"))).toBe(true);
    expect(readFileSync(join(sb.vault, "wiki/topics/topics.md"), "utf8")).toContain(
      "hand-written body",
    );
    // Links into the conflicted folder are left untouched.
    expect(readFileSync(join(sb.vault, "wiki/topics/real-page.md"), "utf8")).toContain(
      "[[topics/_index]]",
    );
    sb.cleanup();
  });
});
