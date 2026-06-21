/**
 * `doctor` — environment + vault health check, agentline-style.
 *
 * Eleven checks (D01–D11), each returning a status of pass | warn | fail |
 * fixed | skip. `--fix` repairs the auto-fixable subset (D04, D05, D08);
 * diagnose-only checks are never mutated. Exit 0 by default; with `--strict`,
 * exit 3 when any check finished warn or fail.
 *
 * Each check is a pure `(ctx: DoctorContext) => CheckResult` registered in the
 * `CHECKS` array; `doctor()` resolves the context once and maps over the
 * registry. Adding a check is one entry in the array plus one function.
 */

import { accessSync, constants, copyFileSync, mkdirSync, chmodSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { readFileSafe, existsSync } from "../../core/fs.ts";
import { resolveVault } from "../../core/vault.ts";
import { declaredSchemaVersion, SUPPORTED_SCHEMA_VERSIONS } from "../../core/schema.ts";
import { isRepo, ensureRepo, repoRoot } from "../../core/git.ts";
import { mapBounded, CONCURRENCY_MAX } from "../../core/checks-runner.ts";
import { verify } from "../verify/verify.ts";

export type DoctorStatus = "pass" | "warn" | "fail" | "fixed" | "skip";

export interface CheckResult {
  readonly id: string;
  readonly title: string;
  readonly status: DoctorStatus;
  readonly message: string;
  readonly hint?: string;
}

export interface DoctorReport {
  readonly command: "doctor";
  readonly vault: string;
  readonly results: readonly CheckResult[];
  /** Worst status across all checks. */
  readonly worst: DoctorStatus;
}

/** External-command runner, injectable so CLI-backed checks stay testable. */
export type DoctorRunner = (
  cmd: string,
  args: readonly string[],
) => { readonly ok: boolean; readonly stdout: string };

const RUNNER_TIMEOUT_MS = 5_000;

const defaultRunner: DoctorRunner = (cmd, args) => {
  const r = spawnSync(cmd, [...args], { encoding: "utf8", timeout: RUNNER_TIMEOUT_MS });
  return { ok: r.status === 0 && r.error === undefined, stdout: r.stdout ?? "" };
};

export interface DoctorOptions {
  readonly target?: string;
  readonly cwd?: string;
  readonly fix?: boolean;
  readonly pluginRoot?: string;
  readonly runner?: DoctorRunner;
}

/** Resolved inputs shared by every check, computed once per `doctor()` run. */
interface DoctorContext {
  readonly vault: string;
  readonly wiki: string;
  readonly cwd: string;
  readonly pluginRoot: string;
  readonly fix: boolean;
  readonly runner: DoctorRunner;
}

type CheckFn = (ctx: DoctorContext) => CheckResult | Promise<CheckResult>;

const OLD_SETTINGS = ".claude/llm-wiki-stack/settings.json";
const NEW_SETTINGS = ".claude/claude-wiki-pages/settings.json";

function canWrite(path: string): boolean {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

// D01 — vault path resolves and exists
function checkVaultPath({ vault }: DoctorContext): CheckResult {
  return existsSync(vault)
    ? { id: "D01", title: "Vault path resolves", status: "pass", message: `vault at ${vault}` }
    : {
        id: "D01",
        title: "Vault path resolves",
        status: "fail",
        message: `no vault at ${vault}`,
        hint: "run /claude-wiki-pages:onboarding to scaffold",
      };
}

// D02 — schema_version present and supported
function checkSchemaVersion({ vault }: DoctorContext): CheckResult {
  const claudeMd = join(vault, "CLAUDE.md");
  const declared = existsSync(claudeMd) ? declaredSchemaVersion(claudeMd) : null;
  if (declared === null) {
    return {
      id: "D02",
      title: "Schema version",
      status: existsSync(claudeMd) ? "fail" : "skip",
      message: existsSync(claudeMd)
        ? "no schema_version in vault/CLAUDE.md"
        : "no vault/CLAUDE.md yet",
      hint: "add `schema_version: 1`",
    };
  }
  if (SUPPORTED_SCHEMA_VERSIONS.includes(declared)) {
    return {
      id: "D02",
      title: "Schema version",
      status: "pass",
      message: `schema_version ${declared} supported`,
    };
  }
  return {
    id: "D02",
    title: "Schema version",
    status: "fail",
    message: `schema_version ${declared} unsupported`,
    hint: "see CHANGELOG.md migration notes",
  };
}

// D03 — raw/ readable, wiki/ writable
function checkLayout({ vault, wiki }: DoctorContext): CheckResult {
  const rawOk = existsSync(join(vault, "raw"));
  const wikiWritable = existsSync(wiki) && canWrite(wiki);
  return rawOk && wikiWritable
    ? {
        id: "D03",
        title: "raw/ + wiki/ layout",
        status: "pass",
        message: "raw/ present, wiki/ writable",
      }
    : {
        id: "D03",
        title: "raw/ + wiki/ layout",
        status: existsSync(vault) ? "fail" : "skip",
        message: `raw present=${rawOk}, wiki writable=${wikiWritable}`,
      };
}

// D04 — every hooks.json script exists and is executable (fixable: chmod +x)
function checkHooks({ pluginRoot, fix }: DoctorContext): CheckResult {
  const hooksJson = readFileSafe(join(pluginRoot, "hooks/hooks.json"));
  if (hooksJson === null)
    return {
      id: "D04",
      title: "Hook scripts",
      status: "skip",
      message: "no hooks/hooks.json (not in plugin repo)",
    };
  const scripts = [...hooksJson.matchAll(/scripts\/([A-Za-z0-9_-]+\.sh)/g)].map((m) => m[1]);
  const unique = [...new Set(scripts)];
  const missing: string[] = [];
  let fixedCount = 0;
  for (const s of unique) {
    const p = join(pluginRoot, "scripts", s ?? "");
    if (!existsSync(p)) {
      missing.push(s ?? "");
      continue;
    }
    let executable = false;
    try {
      accessSync(p, constants.X_OK);
      executable = true;
    } catch {
      executable = false;
    }
    if (!executable && fix) {
      chmodSync(p, 0o755);
      fixedCount++;
    } else if (!executable) {
      missing.push(`${s} (not +x)`);
    }
  }
  if (missing.length)
    return {
      id: "D04",
      title: "Hook scripts",
      status: "fail",
      message: `problem with: ${missing.join(", ")}`,
      hint: "run with --fix to chmod +x",
    };
  if (fixedCount)
    return {
      id: "D04",
      title: "Hook scripts",
      status: "fixed",
      message: `chmod +x on ${fixedCount} hook script(s)`,
    };
  return {
    id: "D04",
    title: "Hook scripts",
    status: "pass",
    message: `${unique.length} hook scripts present and executable`,
  };
}

// D05 — vault is a git repo (fixable: git init)
function checkGitRepo({ vault, fix }: DoctorContext): CheckResult {
  if (!existsSync(vault))
    return { id: "D05", title: "Vault under git", status: "skip", message: "no vault yet" };
  if (isRepo(vault)) {
    const root = repoRoot(vault);
    // realpath both sides: git canonicalises symlinks (/var → /private/var on
    // macOS), plain resolve() does not.
    const own = root !== null && realpathSync(root) === realpathSync(vault);
    return {
      id: "D05",
      title: "Vault under git",
      status: "pass",
      message: own
        ? "vault is its own git repo (self-heal is reversible)"
        : `vault is covered by the repo at ${root ?? "?"} (self-heal is reversible; vault commits are pathspec-scoped)`,
    };
  }
  if (fix) {
    ensureRepo(vault);
    return {
      id: "D05",
      title: "Vault under git",
      status: "fixed",
      message: "initialised git repo for checkpointed self-heal",
    };
  }
  return {
    id: "D05",
    title: "Vault under git",
    status: "warn",
    message: "vault is not a git repo",
    hint: "run with --fix (git init) so auto-heal is reversible",
  };
}

// D06 — Bun present (we are running under it) + engine reachable
function checkBun(): CheckResult {
  return {
    id: "D06",
    title: "Bun engine",
    status: "pass",
    message: "Bun is present (this check ran in it)",
  };
}

// D07 — config.json validation (loader lands later; report presence only)
function checkConfig(): CheckResult {
  const userCfg = join(process.env["HOME"] ?? "~", ".config/claude-wiki-pages/config.json");
  return {
    id: "D07",
    title: "Config",
    status: existsSync(userCfg) ? "pass" : "skip",
    message: existsSync(userCfg) ? "user config present" : "no user config (defaults apply)",
  };
}

// D08 — old settings path migrated to the new one (fixable: copy)
function checkSettingsMigration({ cwd, fix }: DoctorContext): CheckResult {
  const oldPath = join(cwd, OLD_SETTINGS);
  const newPath = join(cwd, NEW_SETTINGS);
  if (!existsSync(oldPath))
    return {
      id: "D08",
      title: "Settings migration",
      status: "pass",
      message: "no legacy settings to migrate",
    };
  if (existsSync(newPath))
    return {
      id: "D08",
      title: "Settings migration",
      status: "pass",
      message: "settings already at the new path",
    };
  if (fix) {
    mkdirSync(dirname(newPath), { recursive: true });
    copyFileSync(oldPath, newPath);
    return {
      id: "D08",
      title: "Settings migration",
      status: "fixed",
      message: `migrated ${OLD_SETTINGS} → ${NEW_SETTINGS}`,
    };
  }
  return {
    id: "D08",
    title: "Settings migration",
    status: "warn",
    message: "legacy settings not yet migrated",
    hint: "run with --fix to copy to the new path",
  };
}

// D09 — verify reports no errors
async function checkVerify({ vault }: DoctorContext): Promise<CheckResult> {
  if (!existsSync(vault))
    return {
      id: "D09",
      title: "Vault integrity (verify)",
      status: "skip",
      message: "no vault yet",
    };
  const v = await verify({ target: vault });
  return v.errors === 0
    ? {
        id: "D09",
        title: "Vault integrity (verify)",
        status: v.warnings ? "warn" : "pass",
        message: `${v.errors} errors, ${v.warnings} warnings`,
      }
    : {
        id: "D09",
        title: "Vault integrity (verify)",
        status: "fail",
        message: `${v.errors} errors`,
        hint: "run `claude-wiki-pages heal` to auto-repair",
      };
}

// D10 — glossary gate (only meaningful inside the plugin repo)
function checkGlossaryGate({ pluginRoot }: DoctorContext): CheckResult {
  return existsSync(join(pluginRoot, "scripts/validate-docs.sh"))
    ? {
        id: "D10",
        title: "Glossary gate",
        status: "skip",
        message: "run `bash scripts/validate-docs.sh` (repo-context check)",
      }
    : { id: "D10", title: "Glossary gate", status: "skip", message: "not in the plugin repo" };
}

/**
 * Count dangling links in Obsidian's `unresolvedLinks` map: outer keys are
 * source files, inner keys are the unresolved targets. Output may arrive
 * double-encoded (eval returns a JSON string the CLI prints quoted).
 */
function countUnresolved(raw: string): number | null {
  try {
    let parsed: unknown = JSON.parse(raw.trim());
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return Object.values(parsed).reduce<number>(
      (n, inner) =>
        n + (inner !== null && typeof inner === "object" ? Object.keys(inner).length : 0),
      0,
    );
  } catch {
    return null;
  }
}

// D11 — Obsidian link parity (advisory: any CLI failure is a skip, never a fail)
function checkLinkParity({ vault, runner }: DoctorContext): CheckResult {
  const title = "Obsidian link parity";
  if (!existsSync(vault)) return { id: "D11", title, status: "skip", message: "no vault yet" };
  const probe = runner("obsidian", [
    "eval",
    "code=JSON.stringify(app.metadataCache.unresolvedLinks)",
    "--vault",
    vault,
  ]);
  if (!probe.ok)
    return {
      id: "D11",
      title,
      status: "skip",
      message: "obsidian CLI unavailable or vault not open (advisory)",
    };
  const count = countUnresolved(probe.stdout);
  if (count === null)
    return { id: "D11", title, status: "skip", message: "unparseable CLI output (advisory)" };
  return count === 0
    ? { id: "D11", title, status: "pass", message: "Obsidian reports no unresolved links" }
    : {
        id: "D11",
        title,
        status: "warn",
        message: `Obsidian reports ${count} unresolved link(s)`,
        hint: "run /claude-wiki-pages:lint",
      };
}

/** The ordered check registry — D01…D11. Order here is the report order. */
const CHECKS: readonly CheckFn[] = [
  checkVaultPath,
  checkSchemaVersion,
  checkLayout,
  checkHooks,
  checkGitRepo,
  checkBun,
  checkConfig,
  checkSettingsMigration,
  checkVerify,
  checkGlossaryGate,
  checkLinkParity,
];

export async function doctor(opts: DoctorOptions = {}): Promise<DoctorReport> {
  const cwd = opts.cwd ?? process.cwd();
  const pluginRoot = opts.pluginRoot ?? cwd;
  const vault = (opts.target ?? resolveVault({ cwd })).replace(/\/+$/, "");
  const ctx: DoctorContext = {
    vault,
    wiki: join(vault, "wiki"),
    cwd,
    pluginRoot,
    fix: opts.fix ?? false,
    runner: opts.runner ?? defaultRunner,
  };
  // Bounded fan-out (order-preserving) instead of an unbounded Promise.all, so
  // the checks honour the same concurrency ceiling the engine uses elsewhere.
  const results = await mapBounded(CHECKS, CONCURRENCY_MAX, (check) => Promise.resolve(check(ctx)));
  return { command: "doctor", vault, results, worst: worstOf(results) };
}

const RANK: Record<DoctorStatus, number> = { pass: 0, skip: 0, fixed: 1, warn: 2, fail: 3 };
function worstOf(results: readonly CheckResult[]): DoctorStatus {
  return results.reduce<DoctorStatus>((w, c) => (RANK[c.status] > RANK[w] ? c.status : w), "pass");
}

/** Exit code: 0 normally; 3 under --strict when any check finished warn or fail. */
export function doctorExit(report: DoctorReport, strict: boolean): number {
  if (strict && (report.worst === "warn" || report.worst === "fail")) return 3;
  return 0;
}
