/**
 * frontmatter-cli — the CLI batch frontmatter validator that
 * scripts/validate-frontmatter.sh ran inline in its `--target [--json]` modes
 * (the awk `validate_content` loop over `<vault>/wiki/**.md`), now in the engine
 * (frontmatter-cli-retire unit, tmp/migration-plan.md "What is left" #2).
 *
 * This is the CLI counterpart to frontmatter-gate.ts (the hot-path hook gate).
 * The hook gate decides ONE write from stdin JSON; this validator walks the whole
 * `<vault>/wiki/` tree and returns one error-severity `frontmatter` Finding per
 * non-conformant page — the `{"findings":[…]}` envelope the bash `--json` mode
 * emitted, and the human-text summary the bare `--target` mode printed.
 *
 * The per-page rules live in src/core/frontmatter-validate.ts (validateContent);
 * the vault walk + bundled-template fallback live in
 * src/core/frontmatter-validate.ts (validateFrontmatter) and frontmatter-gate.ts
 * (resolveSchemaFile) respectively — this module only COMPOSES them, so there is
 * no second copy of the rules or the fallback logic (TEAM-BRIEF §5 DRY).
 *
 * Schema resolution mirrors the bash `_resolve_schema_file`: the vault's
 * CLAUDE.md table when it carries the "### Required fields by type" heading, else
 * the bundled runtime template skills/init/template/CLAUDE.md (eval fixtures /
 * pre-table vaults validate, NOT fail-closed). validateFrontmatter itself fails
 * closed when the resolved schema has no usable table — never silently allows.
 *
 * No `any`; deterministic — same vault + schema → same findings.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Finding } from "../../core/report.ts";
import {
  validateFrontmatterFiles,
  FRONTMATTER_CHECK,
  type FrontmatterFileResult,
} from "../../core/frontmatter-validate.ts";
import { defaultBundledSchema, resolveSchemaFile } from "./frontmatter-gate.ts";

export interface FrontmatterCliOptions {
  /** Absolute path to the resolved active vault root (the bash `$VAULT`). */
  readonly vault: string;
  /**
   * Path to the bundled runtime template used as the fallback schema source.
   * Defaults to skills/init/template/CLAUDE.md (the bash `_BUNDLED_SCHEMA`).
   * Injectable for tests.
   */
  readonly bundledSchemaPath?: string;
}

/** The CLI validator outcome the router maps to stdout + exit code. */
export interface FrontmatterCliResult {
  /**
   * True → `<vault>/wiki/` does not exist; the CLI exits 2 (bad target),
   * matching the bash `[ ! -d "$WIKI" ]` branch. Findings is `[]` in this case.
   */
  readonly missingWiki: boolean;
  /** One error-severity `frontmatter` Finding per non-conformant wiki page. */
  readonly findings: readonly Finding[];
  /**
   * EVERY validated wiki page (pass and fail), in deterministic sorted order —
   * the per-file granularity the bash CLI plain-text mode emitted (one
   * `OK:`/`ERROR:` line per page). The router renders one line per entry so
   * line-counting consumers (scripts/eval-ingest-extract.sh:_score_schema) see
   * one `.md` line per page, NOT a single vault-level summary
   * (frontmatter-cli-retire regression fix).
   */
  readonly files: readonly FrontmatterFileResult[];
}

/**
 * Validate every `*.md` page under `<vault>/wiki/` against the schema, with the
 * bundled-template fallback. Returns the findings envelope + the missing-wiki
 * flag the CLI maps to exit 2.
 *
 * Schema resolution: the vault's CLAUDE.md table when present, else the bundled
 * template (bash `_resolve_schema_file`). When neither carries a usable table,
 * `schemaPath` points at the (nonexistent) vault CLAUDE.md so validateFrontmatter
 * emits the fail-closed "cannot validate" message per page — never a silent pass.
 */
export function frontmatterCli(opts: FrontmatterCliOptions): FrontmatterCliResult {
  const vault = opts.vault.replace(/\/+$/, "");
  const wiki = join(vault, "wiki");
  if (!existsSync(wiki)) {
    return Object.freeze({
      missingWiki: true,
      findings: Object.freeze([]),
      files: Object.freeze([]),
    });
  }

  const bundled = opts.bundledSchemaPath ?? defaultBundledSchema();
  const resolved = resolveSchemaFile(vault, bundled);
  // Fail-closed when neither vault nor bundled template has a usable table:
  // pass the (possibly absent) vault CLAUDE.md so validateFrontmatter emits the
  // per-page "cannot validate" block message instead of silently allowing.
  const schemaPath = resolved ?? join(vault, "CLAUDE.md");

  // One vault walk → per-file results; derive the failures-only findings from it
  // (DRY — single walk, single rule source).
  const files = validateFrontmatterFiles(vault, schemaPath);
  const findings: Finding[] = files
    .filter((r) => !r.ok && r.message !== null)
    .map((r) => ({
      severity: "error" as const,
      check: FRONTMATTER_CHECK,
      message: r.message as string,
      file: r.file,
    }));
  return Object.freeze({
    missingWiki: false,
    findings: Object.freeze(findings),
    files: Object.freeze(files),
  });
}
