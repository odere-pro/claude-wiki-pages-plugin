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
 * The v2 → v3 step (`rename-index`) renames every legacy per-folder index
 * `wiki/**\/_index.md` to its folder note `<dir>/<dirname>.md` and rewrites the
 * `[[…/_index]]` / `[[_index]]` wikilink forms across wiki/ to the new name.
 * A rename whose target filename already exists is reported and skipped — the
 * remaining `_index.md` then carries the verify WARN `legacy-index-filename`.
 *
 * Dry-run by default; `--write` applies the plan under a checkpoint commit so
 * the whole migration is reversible with `git revert <checkpoint>`. Running it
 * again on an already-current vault is a no-op (idempotent).
 */

import { writeFileSync, mkdirSync, renameSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { readFileSafe, existsSync, listMarkdownRecursive } from "../../core/fs.ts";
import { resolveVault } from "../../core/vault.ts";
import { declaredSchemaVersion, CURRENT_SCHEMA_VERSION } from "../../core/schema.ts";
import { buildManifest, MANIFEST_RELATIVE } from "../../core/manifest.ts";
import { ensureRepo, applyCheckpointMode, commit, push } from "../../core/git.ts";
import { appendLog } from "../../core/log.ts";
import { loadConfig } from "../../data/config/config.ts";
import { TOPIC_TEMPLATE, PROJECT_TEMPLATE } from "../../data/templates.ts";

export interface MigrateChange {
  readonly file: string;
  readonly action:
    | "bump-schema"
    | "add-template"
    | "generate-manifest"
    | "rename-index"
    | "rewrite-links";
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

interface PlannedRename {
  readonly from: string;
  readonly to: string;
}

/**
 * Plan the v3 folder-note renames: every `wiki/**\/_index.md` whose target
 * `<dir>/<dirname>.md` is free. Conflicting targets are reported and skipped.
 */
function planIndexRenames(wikiDir: string): {
  renames: PlannedRename[];
  conflicts: string[];
} {
  const renames: PlannedRename[] = [];
  const conflicts: string[] = [];
  for (const p of listMarkdownRecursive(wikiDir).filter((f) => basename(f) === "_index.md")) {
    const target = join(dirname(p), `${basename(dirname(p))}.md`);
    if (existsSync(target)) conflicts.push(p);
    else renames.push({ from: p, to: target });
  }
  return { renames, conflicts };
}

/**
 * Rewrite the legacy `_index` wikilink forms in one page's content:
 * `[[<path>/_index]]` / `[[<path>/_index|label]]` when `<path>` names a renamed
 * folder, and bare `[[_index]]` / `[[_index|label]]` when the page's own folder
 * was renamed. Links into conflict-skipped folders are left untouched.
 */
function rewriteIndexLinks(
  content: string,
  fileDirRel: string,
  renamedDirsRel: readonly string[],
): string {
  const isRenamed = (p: string): boolean =>
    renamedDirsRel.some((d) => d === p || d.endsWith(`/${p}`) || p.endsWith(`/${d}`));

  let out = content.replace(
    /\[\[([^\]|]+)\/_index(\|[^\]]*)?\]\]/g,
    (whole, path: string, label: string | undefined) =>
      isRenamed(path) ? `[[${path}/${basename(path)}${label ?? ""}]]` : whole,
  );
  if (renamedDirsRel.includes(fileDirRel)) {
    out = out.replace(
      /\[\[_index(\|[^\]]*)?\]\]/g,
      (_whole, label: string | undefined) => `[[${basename(fileDirRel)}${label ?? ""}]]`,
    );
  }
  return out;
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

  // v3 — rename-index: legacy `_index.md` files become folder notes, and the
  // `[[…/_index]]` wikilink forms across wiki/ are rewritten to the new name.
  // Gated on presence (no legacy files left = no-op), so re-running is clean.
  const wikiDir = join(vault, "wiki");
  const { renames, conflicts } = planIndexRenames(wikiDir);
  const renamedDirsRel = renames.map((r) => relative(wikiDir, dirname(r.from)));
  const rewrites: PlannedWrite[] = [];
  if (renames.length > 0) {
    const renamedFrom = new Map(renames.map((r) => [r.from, r.to]));
    for (const page of listMarkdownRecursive(wikiDir)) {
      const content = readFileSafe(page);
      if (content === null) continue;
      const next = rewriteIndexLinks(content, relative(wikiDir, dirname(page)), renamedDirsRel);
      if (next !== content) {
        // Write to the post-rename path when the page itself is being renamed.
        const targetPath = renamedFrom.get(page) ?? page;
        rewrites.push({ change: { file: targetPath, action: "rewrite-links" }, content: next });
      }
    }
  }

  const renameChanges: MigrateChange[] = renames.map((r) => ({
    file: `${r.from} -> ${r.to}`,
    action: "rename-index",
  }));
  const conflictNote =
    conflicts.length === 0
      ? ""
      : ` Skipped ${conflicts.length} rename(s) — target filename already exists: ${conflicts.join(", ")}.`;

  const changes = [
    ...renameChanges,
    ...rewrites.map((p) => p.change),
    ...planned.map((p) => p.change),
  ];

  if (changes.length === 0) {
    return report(
      vault,
      from,
      to,
      false,
      [],
      null,
      `Already at schema_version ${to}; nothing to do${conflictNote}`,
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
      `Plan: ${changes.length} change(s). Re-run with --write to apply.${conflictNote}`,
    );
  }

  // Apply under a checkpoint so the migration is reversible.
  const now = opts.isoTime ?? new Date().toISOString();
  const opId = opts.opId ?? `migrate-${now.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const gitCfg = loadConfig({ cwd: opts.cwd }).config.gitCheckpoint;
  const gitOn = gitCfg.mode !== "off";
  if (gitOn) ensureRepo(vault);
  const checkpointSha = applyCheckpointMode(vault, gitCfg.mode, opId, now);

  // Renames first (folder notes take the legacy files' place), then the link
  // rewrites against the post-rename paths, then the additive content writes.
  for (const r of renames) {
    renameSync(r.from, r.to);
  }
  for (const p of [...rewrites, ...planned]) {
    mkdirSync(dirname(p.change.file), { recursive: true });
    writeFileSync(p.change.file, p.content);
  }

  // Record the migration in the log, then commit everything as one revertible unit.
  appendLog(vault, {
    verb: "migrate",
    summary: `schema_version ${from ?? "?"} → ${to} (${changes.length} change(s))`,
    details: [
      ...(checkpointSha ? [`checkpoint: ${checkpointSha}`] : []),
      ...(renames.length > 0 ? [`renamed ${renames.length} legacy _index.md to folder notes`] : []),
      ...(conflicts.length > 0 ? [`skipped ${conflicts.length} rename conflict(s)`] : []),
      "rollback: git revert the migrate commit below",
    ],
    today,
  });
  const migrateCommit = gitOn
    ? commit(vault, `migrate: claude-wiki-pages schema_version ${from ?? "?"} → ${to} ${opId}`)
    : null;
  if (gitCfg.push === "auto") push(vault);

  return report(
    vault,
    from,
    to,
    true,
    changes,
    checkpointSha,
    `Migrated schema_version ${from ?? "?"} → ${to} (${changes.length} change(s)).${conflictNote} Rollback: git revert ${migrateCommit ?? checkpointSha ?? "<commit>"}`,
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
