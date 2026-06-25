/**
 * Parity gate: the Bun `verify` must agree with scripts/verify-ingest.sh on the
 * same vault. Asserts equal error/warning counts so the TypeScript port cannot
 * silently drift from the contract the bats suite already pins.
 */

import { test, expect, describe } from "bun:test";
import { existsSync } from "node:fs";
import { verify } from "./verify.ts";
import {
  makeVault,
  CLEAN_VAULT,
  DIRTY_VAULT,
  DIRTY_VAULT_LEGACY_INDEX,
} from "../../test-helpers/sandbox/vault.ts";

const BASH = "scripts/verify-ingest.sh";

async function bashCounts(vault: string): Promise<{ errors: number; warnings: number }> {
  const proc = Bun.spawn(["bash", BASH, "--target", vault], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const errors = Number(out.match(/Errors:\s*(\d+)/)?.[1] ?? "-1");
  const warnings = Number(out.match(/Warnings:\s*(\d+)/)?.[1] ?? "-1");
  return { errors, warnings };
}

describe("bash parity", () => {
  const hasBash = existsSync(BASH);

  test.if(hasBash)("clean vault: engine matches bash", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const bash = await bashCounts(sb.vault);
    const eng = await verify({ target: sb.vault });
    expect({ errors: eng.errors, warnings: eng.warnings }).toEqual(bash);
    sb.cleanup();
  });

  test.if(hasBash)("dirty vault: engine matches bash", async () => {
    const sb = makeVault(DIRTY_VAULT);
    const bash = await bashCounts(sb.vault);
    const eng = await verify({ target: sb.vault });
    expect({ errors: eng.errors, warnings: eng.warnings }).toEqual(bash);
    sb.cleanup();
  });

  test.if(hasBash)("dirty vault with legacy _index.md: engine matches bash", async () => {
    const sb = makeVault(DIRTY_VAULT_LEGACY_INDEX);
    const bash = await bashCounts(sb.vault);
    const eng = await verify({ target: sb.vault });
    expect({ errors: eng.errors, warnings: eng.warnings }).toEqual(bash);
    sb.cleanup();
  });

  test.if(hasBash)("v3 vault with legacy _index.md: engine WARN count matches bash", async () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Topics — Index]]\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/_index.md":
        '---\ntitle: Topics — Index\ntype: index\nchildren: ["[[Real Page]]"]\n---\n',
      "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nbody\n",
    });
    const bash = await bashCounts(sb.vault);
    const eng = await verify({ target: sb.vault });
    expect(eng.warnings).toBeGreaterThan(0); // the legacy-index-filename WARN
    expect({ errors: eng.errors, warnings: eng.warnings }).toEqual(bash);
    sb.cleanup();
  });
});
