/**
 * `verify` — deterministic vault integrity check.
 *
 * Composes the ported CHECK 0–4 from scripts/verify-ingest.sh into one Report.
 * The parity gate asserts this yields the same error/warn set as the bash
 * script on the shared fixtures, so the command contract (docs/architecture.md) keeps holding under the port.
 */

import { join } from "node:path";
import { existsSync } from "../../core/fs.ts";
import { buildReport, type Report } from "../../core/report.ts";
import { checkSchema } from "../../core/schema.ts";
import { checkIndex, checkSourcesFormat } from "../../core/index-check.ts";
import { checkIndexConsistency, checkOrphanSources, checkTopicFolders } from "../../core/moc.ts";
import { checkCitedSourceStaleness } from "../../core/staleness.ts";
import { checkProvenance } from "../../core/provenance.ts";
import { resolveVault } from "../../core/vault.ts";

export interface VerifyOptions {
  /** Explicit vault path; overrides four-tier resolution (mirrors `--target`). */
  readonly target?: string;
  readonly cwd?: string;
}

export function verify(opts: VerifyOptions = {}): Report {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");

  if (!existsSync(vault)) {
    return buildReport("verify", vault, [
      {
        severity: "error",
        check: "vault",
        message: `Vault directory not found at '${vault}'`,
        file: vault,
      },
    ]);
  }

  const wiki = join(vault, "wiki");
  const findings = [
    ...checkSchema(vault),
    ...checkIndex(wiki),
    ...checkSourcesFormat(wiki),
    ...checkIndexConsistency(wiki),
    ...checkOrphanSources(wiki),
    ...checkTopicFolders(wiki),
    ...checkCitedSourceStaleness(wiki),
    ...checkProvenance(wiki),
  ];

  return buildReport("verify", vault, findings);
}
