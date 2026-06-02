/** Test sandbox: materialise a vault tree from a {relPath: content} map in a tmp dir. */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export interface Sandbox {
  readonly vault: string;
  cleanup(): void;
}

/** Write each file (creating parent dirs) under a fresh tmp vault directory. */
export function makeVault(files: Record<string, string>): Sandbox {
  const root = mkdtempSync(join(tmpdir(), "cwp-test-"));
  const vault = join(root, "vault");
  for (const [rel, content] of Object.entries(files)) {
    const full = join(vault, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return { vault, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** A minimal clean vault: schema'd CLAUDE.md + empty index/log. */
export const CLEAN_VAULT: Record<string, string> = {
  "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
  "wiki/index.md": "---\ntitle: index\n---\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
};

/** A vault exercising every error/warn path in verify (mirrors the manual parity test). */
export const DIRTY_VAULT: Record<string, string> = {
  "CLAUDE.md": "# Vault\nNo schema here.\n",
  "wiki/index.md": "---\ntitle: index\n---\n- [[Alpha]]\n- [[Alpha]]\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/topics/_index.md": '---\ntitle: _index\nchildren: ["[[Ghost Page]]"]\n---\n',
  "wiki/topics/real-page.md": '---\ntitle: Real Page\nsources: ["plain-not-a-link"]\n---\nbody\n',
  "wiki/_sources/orphan.md": "---\ntitle: Orphan Source\n---\n",
  "wiki/empty-topic/loose.md": "---\ntitle: Loose\n---\n",
};
