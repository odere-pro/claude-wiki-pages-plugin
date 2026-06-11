/**
 * `propose` — the human-in-the-loop review surface for drafted pages.
 *
 * Optional local-model (or any) drafting writes proposals to `vault/_proposed/`,
 * mirroring their eventual `wiki/` path (`_proposed/wiki/<topic>/<page>.md`).
 * Because `_proposed/` is a sibling of `wiki/`, it sits outside every
 * wiki-scoped hook and `verify` — drafts are not schema-bound until promoted.
 *
 *   review            — list pending drafts + a lightweight readiness check
 *   approve --file P  — promote a draft into wiki/ (status: active, drop
 *                       proposed_by, stamp updated) under a git checkpoint
 *   reject  --file P  — delete a draft under a git checkpoint
 *
 * Promotion is git-bounded (rollback via `git revert`) and logged. After an
 * approve, the caller should run the maintenance loop (curator heal + polish).
 */

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, relative, basename } from "node:path";
import { existsSync, readFileSafe, listMarkdownRecursive } from "../../core/fs.ts";
import { splitFrontmatter, parseFrontmatter, stringList } from "../../core/frontmatter.ts";
import { resolveVault } from "../../core/vault.ts";
import { ensureRepo, applyCheckpointMode, commit, push } from "../../core/git.ts";
import { appendLog } from "../../core/log.ts";
import { loadConfig } from "../../data/config/config.ts";

export const PROPOSED_DIR = "_proposed";

export type ProposeSub = "review" | "approve" | "reject";

export interface DraftInfo {
  /** Vault-relative draft path under `_proposed/`. */
  readonly file: string;
  /** Vault-relative path it would promote to (the `_proposed/` prefix removed). */
  readonly target: string;
  readonly title: string;
  readonly type: string;
  readonly proposedBy: string;
  /** Lightweight readiness: has a type and at least one source (where required). */
  readonly ready: boolean;
  readonly issues: readonly string[];
}

export interface ProposeReport {
  readonly command: "propose";
  readonly sub: ProposeSub;
  readonly vault: string;
  readonly drafts: readonly DraftInfo[];
  readonly promoted: readonly string[];
  readonly rejected: readonly string[];
  readonly checkpoint: string | null;
  readonly message: string;
}

export interface ProposeOptions {
  readonly target?: string;
  readonly cwd?: string;
  readonly sub: ProposeSub;
  /** Draft path (absolute or vault-relative) for approve/reject. */
  readonly file?: string;
  readonly today?: string;
  readonly opId?: string;
  readonly isoTime?: string;
}

const TYPES_NEEDING_SOURCES = new Set([
  "entity",
  "concept",
  "topic",
  "project",
  "synthesis",
  "source",
]);

function inspectDraft(vault: string, full: string): DraftInfo {
  const content = readFileSafe(full) ?? "";
  const fm = parseFrontmatter(content);
  const type = typeof fm["type"] === "string" ? (fm["type"] as string) : "";
  const title = typeof fm["title"] === "string" ? (fm["title"] as string) : basename(full, ".md");
  const proposedBy = typeof fm["proposed_by"] === "string" ? (fm["proposed_by"] as string) : "";
  const rel = relative(vault, full);
  const target = rel.split("/").slice(1).join("/"); // drop the leading `_proposed/`

  const issues: string[] = [];
  if (!type) issues.push("missing type");
  if (TYPES_NEEDING_SOURCES.has(type) && stringList(fm["sources"]).length === 0)
    issues.push("no sources");
  if (!target || !target.startsWith("wiki/")) issues.push("not under _proposed/wiki/");

  return { file: rel, target, title, type, proposedBy, ready: issues.length === 0, issues };
}

function listDrafts(vault: string): DraftInfo[] {
  const dir = join(vault, PROPOSED_DIR);
  return listMarkdownRecursive(dir).map((full) => inspectDraft(vault, full));
}

/** Promote a draft's frontmatter: status→active, drop proposed_by, stamp updated. */
function promoteFrontmatter(content: string, today: string): string {
  const { frontmatter, body } = splitFrontmatter(content);
  if (frontmatter === null) return content;
  const lines = frontmatter
    .split("\n")
    .filter((l) => !/^proposed_by\s*:/.test(l))
    .map((l) => {
      if (/^status\s*:/.test(l)) return "status: active";
      if (/^updated\s*:/.test(l)) return `updated: ${today}`;
      return l;
    });
  if (!lines.some((l) => /^status\s*:/.test(l))) lines.push("status: active");
  if (!lines.some((l) => /^updated\s*:/.test(l))) lines.push(`updated: ${today}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

function resolveDraftPath(vault: string, file: string): string {
  return file.startsWith("/") ? file : join(vault, file);
}

export function propose(opts: ProposeOptions): ProposeReport {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const base = {
    command: "propose" as const,
    sub: opts.sub,
    vault,
    drafts: [] as DraftInfo[],
    promoted: [] as string[],
    rejected: [] as string[],
    checkpoint: null as string | null,
  };

  if (opts.sub === "review") {
    const drafts = listDrafts(vault);
    return {
      ...base,
      drafts,
      message: drafts.length
        ? `${drafts.length} pending draft(s); ${drafts.filter((d) => d.ready).length} ready to promote`
        : "no pending drafts",
    };
  }

  // approve / reject need a specific draft.
  if (!opts.file) return { ...base, message: `propose ${opts.sub} requires --file <draft>` };
  const draftFull = resolveDraftPath(vault, opts.file);
  if (!existsSync(draftFull)) return { ...base, message: `draft not found: ${opts.file}` };

  const now = opts.isoTime ?? new Date().toISOString();
  const opId = opts.opId ?? `propose-${now.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const gitCfg = loadConfig({ cwd: opts.cwd }).config.gitCheckpoint;
  const pushAuto = gitCfg.push === "auto";
  const gitOn = gitCfg.mode !== "off";
  if (gitOn) ensureRepo(vault);
  const checkpointSha = applyCheckpointMode(vault, gitCfg.mode, opId, now);

  if (opts.sub === "reject") {
    rmSync(draftFull, { force: true });
    appendLog(vault, {
      verb: "propose",
      summary: `reject ${relative(vault, draftFull)}`,
      ...(checkpointSha ? { details: [`checkpoint: ${checkpointSha}`] } : {}),
      today,
    });
    if (gitOn) commit(vault, `propose: reject ${relative(vault, draftFull)} ${opId}`);
    if (pushAuto) push(vault);
    return {
      ...base,
      checkpoint: checkpointSha,
      rejected: [relative(vault, draftFull)],
      message: `rejected ${relative(vault, draftFull)} (rollback: git revert ${checkpointSha ?? "<checkpoint>"})`,
    };
  }

  // approve
  const info = inspectDraft(vault, draftFull);
  if (!info.target.startsWith("wiki/")) {
    return {
      ...base,
      message: `cannot promote: draft is not under ${PROPOSED_DIR}/wiki/ (${info.file})`,
    };
  }
  const targetFull = join(vault, info.target);
  const promoted = promoteFrontmatter(readFileSafe(draftFull) ?? "", today);
  mkdirSync(dirname(targetFull), { recursive: true });
  writeFileSync(targetFull, promoted);
  rmSync(draftFull, { force: true });
  appendLog(vault, {
    verb: "propose",
    summary: `approve ${info.target}`,
    details: [
      ...(checkpointSha ? [`checkpoint: ${checkpointSha}`] : []),
      "next: run curator (heal) + polish",
    ],
    today,
  });
  const c = gitOn ? commit(vault, `propose: approve ${info.target} ${opId}`) : null;
  if (pushAuto) push(vault);
  return {
    ...base,
    checkpoint: checkpointSha,
    promoted: [info.target],
    message: `promoted ${info.target}. Next: curator heal + polish. Rollback: git revert ${c ?? checkpointSha ?? "<commit>"}`,
  };
}
