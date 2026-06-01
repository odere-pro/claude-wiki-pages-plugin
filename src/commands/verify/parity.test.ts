/**
 * Parity gate: the Bun `verify` must agree with scripts/verify-ingest.sh on the
 * same vault. Asserts equal error/warning counts so the TypeScript port cannot
 * silently drift from the contract the bats suite already pins.
 */

import { test, expect, describe } from "bun:test";
import { existsSync } from "node:fs";
import { verify } from "./verify.ts";
import { makeVault, CLEAN_VAULT, DIRTY_VAULT } from "../../test-helpers/sandbox/vault.ts";

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
    const eng = verify({ target: sb.vault });
    expect({ errors: eng.errors, warnings: eng.warnings }).toEqual(bash);
    sb.cleanup();
  });

  test.if(hasBash)("dirty vault: engine matches bash", async () => {
    const sb = makeVault(DIRTY_VAULT);
    const bash = await bashCounts(sb.vault);
    const eng = verify({ target: sb.vault });
    expect({ errors: eng.errors, warnings: eng.warnings }).toEqual(bash);
    sb.cleanup();
  });
});
