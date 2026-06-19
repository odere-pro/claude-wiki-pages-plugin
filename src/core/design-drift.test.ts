/**
 * TDD for design-drift.ts — Check 5 of scripts/validate-docs.sh (ADR-0013).
 *
 * Covers each sub-rule (5a mermaid grounding, 5b link resolution, 5c hook
 * set-equality + PreToolUse-order WARN, 5d feature-relation counts, 5e authority
 * presence, 5f router parity, 5g predicate-node grounding) plus the hooks.json
 * gate.
 *
 * Fixtures are materialised under a real tmp dir so design-drift's `existsSync`
 * link/token resolution sees on-disk targets; tracked/ignored membership is
 * supplied explicitly via the memory RepoIO (mirroring git ls-files /
 * git check-ignore without a real repo).
 */

import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { checkDesignDrift } from "./design-drift.ts";
import { makeMemoryRepoIO } from "./repo-io.ts";

// ── Sandbox ─────────────────────────────────────────────────────────────────────

let activeRoots: string[] = [];

afterEach(() => {
  for (const r of activeRoots) rmSync(r, { recursive: true, force: true });
  activeRoots = [];
});

/** Write files to a fresh tmp dir; returns the absolute root. */
function materialise(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "cwp-design-drift-"));
  activeRoots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

/**
 * Minimal valid plugin tree: hooks.json (so the gate opens), a design doc that
 * depicts every hooked script + an authority link, the feature-relations table
 * with correct counts, the schema predicate table, and a clean router table.
 */
function baseFiles(): Record<string, string> {
  // Mirror the real hooks/hooks.json layout: matcher blocks with multiple commands
  // grouped in one `hooks` array. The bash _HOOKS_PRE_ORDER awk stops at the first
  // `]`-only line, so its PreToolUse order is just the commands in the FIRST matcher
  // block — the engine's hooksPreOrder replicates this exactly.
  const hooksJson = JSON.stringify(
    {
      hooks: {
        SessionStart: [
          { matcher: "*", hooks: [{ type: "command", command: "bash scripts/session-start.sh" }] },
        ],
        UserPromptSubmit: [
          { matcher: "*", hooks: [{ type: "command", command: "bash scripts/prompt-guard.sh" }] },
        ],
        PreToolUse: [
          {
            matcher: "Write|Edit",
            hooks: [
              { type: "command", command: "bash scripts/firewall.sh" },
              { type: "command", command: "bash scripts/validate-frontmatter.sh" },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: "Write|Edit",
            hooks: [{ type: "command", command: "bash scripts/post-wiki-write.sh" }],
          },
        ],
        SubagentStop: [
          { hooks: [{ type: "command", command: "bash scripts/subagent-lint-gate.sh" }] },
        ],
        Stop: [{ hooks: [{ type: "command", command: "bash scripts/session-memory.sh" }] }],
        SessionEnd: [{ hooks: [{ type: "command", command: "bash scripts/session-memory.sh" }] }],
      },
    },
    null,
    2,
  );

  // Design doc depicting every hooked script inside a mermaid fence (5c Set A),
  // plus an authority link (5e). Tokens must resolve (5a) — all are scripts/.
  const designDoc = [
    "# Component design",
    "",
    "See [architecture](../architecture.md).",
    "",
    "```mermaid",
    "graph TD",
    '  pre -->|1| A["scripts/firewall.sh"]',
    '  pre -->|2| B["scripts/validate-frontmatter.sh"]',
    '  S["scripts/session-start.sh"]',
    '  P["scripts/prompt-guard.sh"]',
    '  W["scripts/post-wiki-write.sh"]',
    '  L["scripts/subagent-lint-gate.sh"]',
    '  M["scripts/session-memory.sh"]',
    "```",
    "",
  ].join("\n");

  const featDoc = [
    "# Feature relations",
    "",
    "| Dimension | In this repo? | Notes |",
    "| --- | --- | --- |",
    "| **Commands** | ✅ 1 | one command |",
    "| **Agents** | ✅ 1 | one agent |",
    "| **Skills** | ✅ 1 | one skill |",
    "| **Hooks** | ✅ 7 events | seven events |",
    "",
    "See [architecture](../architecture.md).",
  ].join("\n");

  const schema = [
    "# Schema",
    "",
    "### Predicate domain and range",
    "",
    "| Predicate | Domain | Range | Direction |",
    "| --- | --- | --- | --- |",
    "| `parent` | page | page | up |",
    "| `children` | page | page | down |",
    "| `related` | page | page | sym |",
    "",
    "### Next section",
    "",
  ].join("\n");

  return {
    "hooks/hooks.json": hooksJson,
    "docs/architecture.md": "# Architecture\n",
    "docs/design/02-component-design.md": designDoc,
    "docs/design/06-feature-relations.md": featDoc,
    "commands/wiki.md": "# wiki\n",
    "agents/orchestrator.md": "# orchestrator\n",
    "skills/init/SKILL.md": "# init\n",
    "skills/init/template/CLAUDE.md": schema,
  };
}

/**
 * Tracked set: every file key, plus the hooked script paths so the 5a mermaid
 * tokens (`scripts/X.sh`) resolve via the git ls-files basename match (mirrors
 * validate-docs.sh _token_resolves, which checks the git inventory — the scripts
 * need not exist on disk).
 */
const HOOKED_SCRIPTS = [
  "scripts/firewall.sh",
  "scripts/validate-frontmatter.sh",
  "scripts/session-start.sh",
  "scripts/prompt-guard.sh",
  "scripts/post-wiki-write.sh",
  "scripts/subagent-lint-gate.sh",
  "scripts/session-memory.sh",
  "scripts/protect-raw.sh",
] as const;

function trackedFor(files: Record<string, string>): string[] {
  return [...Object.keys(files), ...HOOKED_SCRIPTS];
}

// ── Gate ──────────────────────────────────────────────────────────────────────

describe("checkDesignDrift — gate", () => {
  test("returns no findings when hooks/hooks.json is not tracked", () => {
    const files = baseFiles();
    const root = materialise(files);
    const tracked = trackedFor(files).filter((f) => f !== "hooks/hooks.json");
    const io = makeMemoryRepoIO({ root, files, tracked });
    expect(checkDesignDrift(io)).toHaveLength(0);
  });

  test("clean base tree yields zero design-drift findings", () => {
    const files = baseFiles();
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    expect(checkDesignDrift(io)).toHaveLength(0);
  });
});

// ── 5a mermaid grounding ────────────────────────────────────────────────────────

describe("checkDesignDrift — 5a mermaid grounding", () => {
  test("unresolved mermaid file token is a 5a error", () => {
    const files = baseFiles();
    files["docs/design/01-system-context.md"] = [
      "# Context",
      "See [architecture](../architecture.md).",
      "```mermaid",
      "graph TD",
      '  X["scripts/does-not-exist.sh"]',
      "```",
    ].join("\n");
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5a");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]?.severity).toBe("error");
    expect(hits[0]?.message).toContain("does-not-exist.sh");
  });

  test("[speculative] docs are exempt from 5a grounding", () => {
    const files = baseFiles();
    files["docs/design/01-system-context.md"] = [
      "# Context [speculative]",
      "See [architecture](../architecture.md).",
      "```mermaid",
      "graph TD",
      '  X["scripts/does-not-exist.sh"]',
      "```",
    ].join("\n");
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5a");
    expect(hits).toHaveLength(0);
  });
});

// ── 5b link resolution ──────────────────────────────────────────────────────────

describe("checkDesignDrift — 5b link resolution", () => {
  test("dead relative link is a 5b error", () => {
    const files = baseFiles();
    files["docs/design/01-system-context.md"] = [
      "# Context",
      "See [architecture](../architecture.md).",
      "Broken: [gone](./nope/missing.md).",
    ].join("\n");
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5b");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]?.message).toContain("missing.md");
  });

  test("gitignored target is treated as resolved (no 5b error)", () => {
    const files = baseFiles();
    files["docs/design/01-system-context.md"] = [
      "# Context",
      "See [architecture](../architecture.md).",
      "Generated: [built](./generated.md).",
    ].join("\n");
    const root = materialise(files);
    const io = makeMemoryRepoIO({
      root,
      files,
      tracked: trackedFor(files),
      ignored: ["docs/design/generated.md"],
    });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5b");
    expect(hits).toHaveLength(0);
  });
});

// ── 5c hook set-equality + ordering ─────────────────────────────────────────────

describe("checkDesignDrift — 5c hook set-equality", () => {
  test("a hooked script not depicted in any design fence is a 5c error", () => {
    const files = baseFiles();
    // Wire a new script in hooks.json that no design doc depicts.
    const hooks = JSON.parse(files["hooks/hooks.json"]!) as {
      hooks: { PreToolUse: { hooks: { command: string }[] }[] };
    };
    hooks.hooks.PreToolUse.push({ hooks: [{ command: "bash scripts/protect-raw.sh" }] });
    files["hooks/hooks.json"] = JSON.stringify(hooks, null, 2);
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5c");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]?.message).toContain("protect-raw.sh");
    expect(hits[0]?.severity).toBe("error");
  });

  test("PreToolUse order delta is a WARN, not an error", () => {
    const files = baseFiles();
    // Reverse the design-doc PreToolUse order vs hooks.json (which is firewall then frontmatter).
    files["docs/design/02-component-design.md"] = [
      "# Component design",
      "See [architecture](../architecture.md).",
      "```mermaid",
      "graph TD",
      "  SessionStart --> a",
      "  UserPromptSubmit --> b",
      "  PreToolUse --> c",
      "  PostToolUse --> d",
      "  SubagentStop --> e",
      '  pre --> B["validate-frontmatter.sh"]',
      '  pre --> A["firewall.sh"]',
      '  S["scripts/session-start.sh"]',
      '  P["scripts/prompt-guard.sh"]',
      '  W["scripts/post-wiki-write.sh"]',
      '  L["scripts/subagent-lint-gate.sh"]',
      '  M["scripts/session-memory.sh"]',
      "```",
    ].join("\n");
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const all = checkDesignDrift(io);
    const orderWarn = all.filter((f) => f.check === "docs-check-design-drift-5c-order");
    expect(orderWarn.length).toBe(1);
    expect(orderWarn[0]?.severity).toBe("warn");
    // The order delta must NOT add any error-severity finding.
    expect(all.filter((f) => f.severity === "error")).toHaveLength(0);
  });
});

// ── 5d feature-relation counts ──────────────────────────────────────────────────

describe("checkDesignDrift — 5d counts", () => {
  test("a stated count mismatch is a 5d error", () => {
    const files = baseFiles();
    // Add a second agent so actual=2 but the table still says 1.
    files["agents/second.md"] = "# second\n";
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5d");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.some((f) => f.message.includes("agents stated=1 actual=2"))).toBe(true);
  });

  test("an unextractable stated count is a 5d error", () => {
    const files = baseFiles();
    files["docs/design/06-feature-relations.md"] = files[
      "docs/design/06-feature-relations.md"
    ]!.replace("| **Agents** | ✅ 1 | one agent |", "| **Agents** | (missing) | no number |");
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5d");
    expect(hits.some((f) => f.message.includes("agents stated=<unextractable>"))).toBe(true);
  });
});

// ── 5e authority presence ───────────────────────────────────────────────────────

describe("checkDesignDrift — 5e authority", () => {
  test("a doc with no authority link is a 5e error", () => {
    const files = baseFiles();
    files["docs/design/01-system-context.md"] = "# Context\n\nNo authority links here.\n";
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5e");
    expect(hits.some((f) => f.file === "docs/design/01-system-context.md")).toBe(true);
  });
});

// ── 5f router parity ────────────────────────────────────────────────────────────

describe("checkDesignDrift — 5f router parity", () => {
  function withRouter(rows: string): Record<string, string> {
    const files = baseFiles();
    files["SOFTWARE-3-0.md"] = [
      "# Software 3.0",
      "",
      "| Surface | Human on-ramp | Agent on-ramp |",
      "| --- | --- | --- |",
      rows,
      "",
      "See [architecture](./docs/architecture.md).",
    ].join("\n");
    // SOFTWARE-3-0 links are rooted at repo root; ensure targets exist for clean rows.
    files["docs/operations.md"] = "# ops\n";
    return files;
  }

  test("a row missing the agent on-ramp is a 5f error", () => {
    const files = withRouter("| **Docs** | [ops](./docs/operations.md) | &nbsp; |");
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5f");
    expect(hits.some((f) => f.message.includes("missing human or agent on-ramp"))).toBe(true);
  });

  test("a dead link in a router cell is a 5f error", () => {
    const files = withRouter(
      "| **Docs** | [ops](./docs/operations.md) | [gone](./docs/missing.md) |",
    );
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5f");
    expect(hits.some((f) => f.message.includes("dead link in router row"))).toBe(true);
  });

  test("a fully-ramped row with resolving links is clean", () => {
    const files = withRouter(
      "| **Docs** | [ops](./docs/operations.md) | [arch](./docs/architecture.md) |",
    );
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5f");
    expect(hits).toHaveLength(0);
  });
});

// ── 5g predicate-node grounding ─────────────────────────────────────────────────

describe("checkDesignDrift — 5g predicate-node grounding", () => {
  test("a diagram predicate absent from the schema table is a 5g error", () => {
    const files = baseFiles();
    files["docs/design/07-ontology.md"] = [
      "# Ontology",
      "See [schema](../../skills/init/template/CLAUDE.md).",
      "```mermaid",
      "graph LR",
      "  A -->|parent| B",
      "  B -->|bogus_pred| C",
      "```",
    ].join("\n");
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5g");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]?.message).toContain("bogus_pred");
  });

  test("diagram predicates all in the schema table are clean", () => {
    const files = baseFiles();
    files["docs/design/07-ontology.md"] = [
      "# Ontology",
      "See [schema](../../skills/init/template/CLAUDE.md).",
      "```mermaid",
      "graph LR",
      "  A -->|parent| B",
      "  B -->|children| C",
      "  C -->|related| D",
      "```",
    ].join("\n");
    const root = materialise(files);
    const io = makeMemoryRepoIO({ root, files, tracked: trackedFor(files) });
    const hits = checkDesignDrift(io).filter((f) => f.check === "docs-check-design-drift-5g");
    expect(hits).toHaveLength(0);
  });
});
