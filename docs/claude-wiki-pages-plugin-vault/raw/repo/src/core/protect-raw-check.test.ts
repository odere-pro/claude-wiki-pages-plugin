/**
 * Colocated tests for the raw-immutability decision core (protect-raw.sh twin).
 *
 * Covers the three behaviours the bash hook encodes:
 *   1. Write/Edit under raw/ → BLOCK (raw is append-only, §5 non-negotiable).
 *   2. Write/Edit outside raw/ (e.g. wiki/) → ALLOW (not this gate's concern).
 *   3. The sanctioned durable-memory carve-out: a NEW file under
 *      raw/agent-sessions/ that declares `source_type: agent-session` in its
 *      YAML frontmatter → ALLOW; anything else under the fence → BLOCK.
 *
 * Uses the makeVault sandbox so existing-file checks hit a real filesystem with
 * physical (symlink-resolved) paths, exactly as the hook decides at runtime.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { symlinkSync } from "node:fs";
import { join } from "node:path";
import { makeVault, type Sandbox } from "../test-helpers/sandbox/vault";
import { checkRawWrite, type RawWriteRequest } from "./protect-raw-check";

const AGENT_SESSION_FM = "---\nsource_type: agent-session\nsession_id: s-1\n---\n# learning\n";

let sandbox: Sandbox | undefined;
afterEach(() => {
  sandbox?.cleanup();
  sandbox = undefined;
});

function findingsFor(req: RawWriteRequest) {
  return checkRawWrite(req);
}

describe("checkRawWrite — raw/ immutability", () => {
  test("blocks Edit to an existing file under raw/", () => {
    sandbox = makeVault({ "raw/paper.md": "---\nsource_type: paper\n---\nbody\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Edit",
      filePath: join(sandbox.vault, "raw", "paper.md"),
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.check).toBe("raw-immutable");
  });

  test("blocks Write that overwrites an existing source under raw/", () => {
    sandbox = makeVault({ "raw/paper.md": "---\nsource_type: paper\n---\nbody\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Write",
      filePath: join(sandbox.vault, "raw", "paper.md"),
      content: "overwrite",
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
  });

  test("allows Write of a brand-new source directly under raw/", () => {
    sandbox = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Write",
      filePath: join(sandbox.vault, "raw", "new-paper.md"),
      content: "---\nsource_type: paper\n---\nbody\n",
    });
    expect(findings).toEqual([]);
  });

  test("blocks Edit of a non-existent path under raw/ (no new-file exemption for Edit)", () => {
    sandbox = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Edit",
      filePath: join(sandbox.vault, "raw", "ghost.md"),
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
  });
});

describe("checkRawWrite — paths outside raw/", () => {
  test("allows a wiki/ write (not this gate's boundary)", () => {
    sandbox = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Write",
      filePath: join(sandbox.vault, "wiki", "topics", "alpha.md"),
      content: "---\ntitle: Alpha\n---\n",
    });
    expect(findings).toEqual([]);
  });

  test("allows an Edit to an existing wiki/ file", () => {
    sandbox = makeVault({ "wiki/index.md": "---\ntitle: index\n---\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Edit",
      filePath: join(sandbox.vault, "wiki", "index.md"),
    });
    expect(findings).toEqual([]);
  });

  test("ignores an empty file path", () => {
    sandbox = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const findings = findingsFor({ vault: sandbox.vault, tool: "Write", filePath: "" });
    expect(findings).toEqual([]);
  });
});

describe("checkRawWrite — sanctioned agent-session carve-out", () => {
  test("allows a NEW agent-session file with the frontmatter marker", () => {
    sandbox = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Write",
      filePath: join(sandbox.vault, "raw", "agent-sessions", "2026-06-18-s1.md"),
      content: AGENT_SESSION_FM,
    });
    expect(findings).toEqual([]);
  });

  test("blocks a NEW agent-session file WITHOUT the frontmatter marker", () => {
    sandbox = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Write",
      filePath: join(sandbox.vault, "raw", "agent-sessions", "2026-06-18-s1.md"),
      content: "---\nsource_type: paper\n---\nbody\n",
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toContain("source_type: agent-session");
  });

  test("does NOT honour a body-only marker (fence is frontmatter-scoped)", () => {
    sandbox = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Write",
      filePath: join(sandbox.vault, "raw", "agent-sessions", "2026-06-18-s1.md"),
      content: "---\nsource_type: paper\n---\nsource_type: agent-session\n",
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
  });

  test("blocks content with no frontmatter at all under the fence", () => {
    sandbox = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Write",
      filePath: join(sandbox.vault, "raw", "agent-sessions", "loose.md"),
      content: "source_type: agent-session\n",
    });
    expect(findings.length).toBe(1);
  });

  test("blocks an Edit under the fence even with the marker (carve-out is Write-of-new only)", () => {
    sandbox = makeVault({
      "raw/agent-sessions/existing.md": AGENT_SESSION_FM,
    });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Edit",
      filePath: join(sandbox.vault, "raw", "agent-sessions", "existing.md"),
      content: AGENT_SESSION_FM,
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
  });

  test("blocks a Write that overwrites an existing agent-session file (immutable once written)", () => {
    sandbox = makeVault({
      "raw/agent-sessions/existing.md": AGENT_SESSION_FM,
    });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Write",
      filePath: join(sandbox.vault, "raw", "agent-sessions", "existing.md"),
      content: AGENT_SESSION_FM,
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
  });
});

describe("checkRawWrite — security / fail-closed posture", () => {
  test("a traversal that resolves back into raw/ is still blocked", () => {
    sandbox = makeVault({ "raw/paper.md": "---\nsource_type: paper\n---\nbody\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Edit",
      filePath: join(sandbox.vault, "wiki", "..", "raw", "paper.md"),
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
  });

  test("a symlink inside the vault pointing at raw/ cannot smuggle an Edit past the gate", () => {
    sandbox = makeVault({ "raw/paper.md": "---\nsource_type: paper\n---\nbody\n" });
    // Symlink <vault>/link-to-raw -> <vault>/raw, then Edit through it.
    const linkPath = join(sandbox.vault, "link-to-raw");
    symlinkSync(join(sandbox.vault, "raw"), linkPath);
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "Edit",
      filePath: join(linkPath, "paper.md"),
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
  });

  test("unknown tool names under raw/ are blocked (default-deny), not silently allowed", () => {
    sandbox = makeVault({ "raw/paper.md": "---\nsource_type: paper\n---\nbody\n" });
    const findings = findingsFor({
      vault: sandbox.vault,
      tool: "MultiEdit",
      filePath: join(sandbox.vault, "raw", "paper.md"),
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
  });
});
