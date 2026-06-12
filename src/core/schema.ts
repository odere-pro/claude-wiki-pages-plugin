/** Vault schema_version gate — ports scripts/verify-ingest.sh CHECK 0. */

import { join } from "node:path";
import { readFileSafe, existsSync } from "./fs.ts";
import type { Finding } from "./report.ts";

export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1, 2, 3];

/** The version `migrate` upgrades a vault to, and the version new vaults declare. */
export const CURRENT_SCHEMA_VERSION = 3;

/** Extract the first declared schema_version, tolerating backtick-wrapped forms. */
export function declaredSchemaVersion(vaultClaudeMd: string): number | null {
  const content = readFileSafe(vaultClaudeMd);
  if (content === null) return null;
  const m = content.match(/`?schema_version`?:\s*`?(\d+)`?/);
  return m ? Number(m[1]) : null;
}

/** Findings for the schema_version check. Empty when supported or file absent. */
export function checkSchema(vault: string): Finding[] {
  const claudeMd = join(vault, "CLAUDE.md");
  if (!existsSync(claudeMd)) {
    return [
      {
        severity: "info",
        check: "schema",
        message: `${claudeMd} not found — skipping schema_version check`,
        file: claudeMd,
      },
    ];
  }
  const declared = declaredSchemaVersion(claudeMd);
  if (declared === null) {
    return [
      {
        severity: "error",
        check: "schema",
        message: `${claudeMd} declares no schema_version. Add \`schema_version: ${CURRENT_SCHEMA_VERSION}\` near the top.`,
        file: claudeMd,
      },
    ];
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(declared)) {
    return [
      {
        severity: "error",
        check: "schema",
        message: `schema_version ${declared} is unsupported (this build supports: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}). See CHANGELOG.md for migration notes.`,
        file: claudeMd,
      },
    ];
  }
  return [];
}
