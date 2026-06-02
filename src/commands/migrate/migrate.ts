/**
 * `migrate` — upgrade a vault's schema_version to the current version.
 *
 * Additive and git-bounded. The upgrade from v1 → v2 (1) bumps the declared
 * `schema_version` in `vault/CLAUDE.md`, (2) writes the new `topic`/`project`
 * templates into `_templates/` when absent, and (3) generates the source
 * manifest at `wiki/_sources/manifest.md` when absent. The new optional fields
 * (`source_quotes`, `derived`) are NOT backfilled into existing pages — they
 * are optional, so untouched pages stay valid; they are added lazily by ingest.
 *
 * Dry-run by default; `--write` applies the plan under a checkpoint commit so
 * the whole migration is reversible with `git revert <checkpoint>`. Running it
 * again on an already-current vault is a no-op (idempotent).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { readFileSafe, existsSync } from "../../core/fs.ts";
import { resolveVault } from "../../core/vault.ts";
import { declaredSchemaVersion, CURRENT_SCHEMA_VERSION } from "../../core/schema.ts";
import { buildManifest, MANIFEST_RELATIVE } from "../../core/manifest.ts";
import { ensureRepo, checkpoint, commit, push } from "../../core/git.ts";
import { appendLog } from "../../core/log.ts";
import { loadConfig } from "../../data/config/config.ts";
import { TOPIC_TEMPLATE, PROJECT_TEMPLATE } from "../../data/templates.ts";

export interface MigrateChange {
  readonly file: string;
  readonly action: "bump-schema" | "add-template" | "generate-manifest";
}

export interface MigrateReport {
  readonly command: "migrate";
  readonly vault: string;
  readonly from: number | null;
  readonly to: number;
  readonly applied: boolean;
  readonly changes: readonly MigrateChange[];
  readonly checkpoint: string | null;
  readonly message: string;
}

export interface MigrateOptions {
  readonly target?: string;
  readonly cwd?: string;
  /** Apply the plan. When false (default), report the plan without writing. */
  readonly write?: boolean;
  /** Injectable for deterministic tests; default derived from the wall clock. */
  readonly today?: string;
  readonly opId?: string;
  readonly isoTime?: string;
}

interface PlannedWrite {
  readonly change: MigrateChange;
  readonly content: string;
}

/** Replace the first declared schema_version with `to`, preserving backtick style. */
function bumpSchemaVersion(content: string, to: number): string {
  return content.replace(/(`?schema_version`?:\s*`?)(\d+)(`?)/, `$1${to}$3`);
}

export function migrate(opts: MigrateOptions = {}): MigrateReport {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const to = CURRENT_SCHEMA_VERSION;

  if (!existsSync(vault)) {
    return report(vault, null, to, false, [], null, `Vault not found at '${vault}'`);
  }

  const claudeMd = join(vault, "CLAUDE.md");
  const claudeContent = readFileSafe(claudeMd);
  if (claudeContent === null) {
    return report(vault, null, to, false, [], null, `No CLAUDE.md at '${claudeMd}'`);
  }
  const from = declaredSchemaVersion(claudeMd);

  // Plan the writes. Each is gated on absence/staleness so re-running is a no-op.
  const planned: PlannedWrite[] = [];

  if (from === null || from < to) {
    planned.push({
      change: { file: claudeMd, action: "bump-schema" },
      content: bumpSchemaVersion(claudeContent, to),
    });
  }

  const topicTpl = join(vault, "_templates", "topic.md");
  if (!existsSync(topicTpl)) {
    planned.push({ change: { file: topicTpl, action: "add-template" }, content: TOPIC_TEMPLATE });
  }
  const projectTpl = join(vault, "_templates", "project.md");
  if (!existsSync(projectTpl)) {
    planned.push({
      change: { file: projectTpl, action: "add-template" },
      content: PROJECT_TEMPLATE,
    });
  }

  const manifestPath = join(vault, MANIFEST_RELATIVE);
  if (existsSync(join(vault, "wiki", "_sources")) && !existsSync(manifestPath)) {
    planned.push({
      change: { file: manifestPath, action: "generate-manifest" },
      content: buildManifest(vault, today),
    });
  }

  const changes = planned.map((p) => p.change);

  if (changes.length === 0) {
    return report(
      vault,
      from,
      to,
      false,
      [],
      null,
      `Already at schema_version ${to}; nothing to do`,
    );
  }

  if (!opts.write) {
    return report(
      vault,
      from,
      to,
      false,
      changes,
      null,
      `Plan: ${changes.length} change(s). Re-run with --write to apply.`,
    );
  }

  // Apply under a checkpoint so the migration is reversible.
  const now = opts.isoTime ?? new Date().toISOString();
  const opId = opts.opId ?? `migrate-${now.replace(/[^0-9]/g, "").slice(0, 14)}`;
  ensureRepo(vault);
  const checkpointSha = checkpoint(vault, opId, now, false);

  for (const p of planned) {
    mkdirSync(dirname(p.change.file), { recursive: true });
    writeFileSync(p.change.file, p.content);
  }

  // Record the migration in the log, then commit everything as one revertible unit.
  appendLog(vault, {
    verb: "migrate",
    summary: `schema_version ${from ?? "?"} → ${to} (${changes.length} change(s))`,
    details: ["rollback: git revert the migrate commit below"],
    today,
  });
  const migrateCommit = commit(
    vault,
    `migrate: claude-wiki-pages schema_version ${from ?? "?"} → ${to} ${opId}`,
  );
  if (loadConfig({ cwd: opts.cwd }).config.gitCheckpoint.push === "auto") push(vault);

  return report(
    vault,
    from,
    to,
    true,
    changes,
    checkpointSha,
    `Migrated schema_version ${from ?? "?"} → ${to} (${changes.length} change(s)). Rollback: git revert ${migrateCommit ?? checkpointSha ?? "<commit>"}`,
  );
}

function report(
  vault: string,
  from: number | null,
  to: number,
  applied: boolean,
  changes: readonly MigrateChange[],
  checkpointSha: string | null,
  message: string,
): MigrateReport {
  return {
    command: "migrate",
    vault,
    from,
    to,
    applied,
    changes,
    checkpoint: checkpointSha,
    message,
  };
}
