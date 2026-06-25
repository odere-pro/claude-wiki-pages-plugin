import { test, expect, describe } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { propose } from "./propose.ts";
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

const DRAFT = `---
title: "Retrieval"
type: concept
aliases: ["Retrieval"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
proposed_by: "ollama:llama3"
created: 2026-06-01
updated: 2026-06-01
status: draft
confidence: 0.6
---

# Retrieval

Drafted by a local model.
`;

const VAULT = {
  "CLAUDE.md": "---\nschema_version: 2\n---\n",
  "wiki/index.md": "---\ntitle: index\n---\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "_proposed/wiki/topics/retrieval.md": DRAFT,
};

const opts = { opId: "test-prop", isoTime: "2026-06-02T00:00:00.000Z", today: "2026-06-02" };

describe("Feature: Engine › propose verb", () => {
  test("review lists pending drafts with readiness", () => {
    const sb = makeVault(VAULT);
    const r = propose({ target: sb.vault, sub: "review", ...opts });
    expect(r.drafts).toHaveLength(1);
    expect(r.drafts[0]?.target).toBe("wiki/topics/retrieval.md");
    expect(r.drafts[0]?.ready).toBe(true);
    expect(r.drafts[0]?.proposedBy).toBe("ollama:llama3");
    sb.cleanup();
  });

  test("approve promotes the draft into wiki/ and rewrites frontmatter", () => {
    const sb = makeVault(VAULT);
    initRepo(sb.vault);
    const r = propose({
      target: sb.vault,
      sub: "approve",
      file: "_proposed/wiki/topics/retrieval.md",
      ...opts,
    });
    expect(r.promoted).toEqual(["wiki/topics/retrieval.md"]);
    expect(existsSync(join(sb.vault, "_proposed/wiki/topics/retrieval.md"))).toBe(false);
    const promoted = readFileSync(join(sb.vault, "wiki/topics/retrieval.md"), "utf8");
    expect(promoted).toContain("status: active");
    expect(promoted).not.toContain("proposed_by");
    expect(promoted).toContain("updated: 2026-06-02");
    sb.cleanup();
  });

  test("reject deletes the draft", () => {
    const sb = makeVault(VAULT);
    initRepo(sb.vault);
    const r = propose({
      target: sb.vault,
      sub: "reject",
      file: "_proposed/wiki/topics/retrieval.md",
      ...opts,
    });
    expect(r.rejected).toEqual(["_proposed/wiki/topics/retrieval.md"]);
    expect(existsSync(join(sb.vault, "_proposed/wiki/topics/retrieval.md"))).toBe(false);
    expect(existsSync(join(sb.vault, "wiki/topics/retrieval.md"))).toBe(false);
    sb.cleanup();
  });

  test("review flags a draft missing sources as not ready", () => {
    const sb = makeVault({
      ...VAULT,
      "_proposed/wiki/topics/bare.md": "---\ntitle: Bare\ntype: concept\n---\n# Bare\n",
    });
    const r = propose({ target: sb.vault, sub: "review", ...opts });
    const bare = r.drafts.find((d) => d.target === "wiki/topics/bare.md");
    expect(bare?.ready).toBe(false);
    expect(bare?.issues).toContain("no sources");
    sb.cleanup();
  });
});
