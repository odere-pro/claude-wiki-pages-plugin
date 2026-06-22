/**
 * Tests for the one per-vault topic derivation (universality contract).
 * Topics must come from the vault's OWN folders, never a hardcoded list.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { deriveTopics, SPECIAL_DIRS } from "./topics.ts";

describe("deriveTopics", () => {
  test("derives the vault's own top-level wiki folders, sorted", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      // An arbitrary project's topics — NOT the plugin's dogfood folders.
      "wiki/agents/agents.md": "---\ntitle: Agents\n---\n",
      "wiki/concepts/concepts.md": "---\ntitle: Concepts\n---\n",
      "wiki/skills/skills.md": "---\ntitle: Skills\n---\n",
    });
    expect(deriveTopics(join(sb.vault, "wiki"))).toEqual(["agents", "concepts", "skills"]);
    sb.cleanup();
  });

  test("excludes scaffolding folders and top-level files", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topic-a/topic-a.md": "---\ntitle: A\n---\n",
      "wiki/_sources/manifest.md": "---\ntitle: manifest\n---\n",
      "wiki/_synthesis/s.md": "---\ntitle: S\n---\n",
      "wiki/_proposed/p.md": "---\ntitle: P\n---\n",
    });
    const topics = deriveTopics(join(sb.vault, "wiki"));
    expect(topics).toEqual(["topic-a"]);
    for (const special of SPECIAL_DIRS) expect(topics).not.toContain(special);
    sb.cleanup();
  });

  test("returns [] for a missing wiki directory", () => {
    expect(deriveTopics("/nonexistent/path/wiki")).toEqual([]);
  });
});
