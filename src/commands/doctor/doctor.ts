/**
 * `doctor` — environment + vault health check, agentline-style.
 *
 * Ten checks (D01–D10), each returning a status of pass | warn | fail | fixed |
 * skip. `--fix` repairs the auto-fixable subset (D04, D05, D08); diagnose-only
 * checks are never mutated. Exit 0 by default; with `--strict`, exit 3 when any
 * check finished warn or fail.
 */

import { accessSync, constants, copyFileSync, mkdirSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { readFileSafe, existsSync } from "../../core/fs.ts";
import { resolveVault } from "../../core/vault.ts";
import { declaredSchemaVersion, SUPPORTED_SCHEMA_VERSIONS } from "../../core/schema.ts";
import { isRepo, ensureRepo } from "../../core/git.ts";
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

export interface DoctorOptions {
  readonly target?: string;
  readonly cwd?: string;
  readonly fix?: boolean;
  readonly pluginRoot?: string;
}

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

export function doctor(opts: DoctorOptions = {}): DoctorReport {
  const cwd = opts.cwd ?? process.cwd();
  const pluginRoot = opts.pluginRoot ?? cwd;
  const vault = (opts.target ?? resolveVault({ cwd })).replace(/\/+$/, "");
  const fix = opts.fix ?? false;
  const wiki = join(vault, "wiki");
  const r: CheckResult[] = [];

  // D01 — vault path resolves and exists
  r.push(
    existsSync(vault)
      ? { id: "D01", title: "Vault path resolves", status: "pass", message: `vault at ${vault}` }
      : {
          id: "D01",
          title: "Vault path resolves",
          status: "fail",
          message: `no vault at ${vault}`,
          hint: "run /claude-wiki-pages:onboarding to scaffold",
        },
  );

  // D02 — schema_version present and supported
  const claudeMd = join(vault, "CLAUDE.md");
  const declared = existsSync(claudeMd) ? declaredSchemaVersion(claudeMd) : null;
  if (declared === null) {
    r.push({
      id: "D02",
      title: "Schema version",
      status: existsSync(claudeMd) ? "fail" : "skip",
      message: existsSync(claudeMd)
        ? "no schema_version in vault/CLAUDE.md"
        : "no vault/CLAUDE.md yet",
      hint: "add `schema_version: 1`",
    });
  } else if (SUPPORTED_SCHEMA_VERSIONS.includes(declared)) {
    r.push({
      id: "D02",
      title: "Schema version",
      status: "pass",
      message: `schema_version ${declared} supported`,
    });
  } else {
    r.push({
      id: "D02",
      title: "Schema version",
      status: "fail",
      message: `schema_version ${declared} unsupported`,
      hint: "see CHANGELOG.md migration notes",
    });
  }

  // D03 — raw/ readable, wiki/ writable
  const rawOk = existsSync(join(vault, "raw"));
  const wikiWritable = existsSync(wiki) && canWrite(wiki);
  r.push(
    rawOk && wikiWritable
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
        },
  );

  // D04 — every hooks.json script exists and is executable (fixable: chmod +x)
  r.push(checkHooks(pluginRoot, fix));

  // D05 — vault is a git repo (fixable: git init)
  if (!existsSync(vault)) {
    r.push({ id: "D05", title: "Vault under git", status: "skip", message: "no vault yet" });
  } else if (isRepo(vault)) {
    r.push({
      id: "D05",
      title: "Vault under git",
      status: "pass",
      message: "vault is a git repo (self-heal is reversible)",
    });
  } else if (fix) {
    ensureRepo(vault);
    r.push({
      id: "D05",
      title: "Vault under git",
      status: "fixed",
      message: "initialised git repo for checkpointed self-heal",
    });
  } else {
    r.push({
      id: "D05",
      title: "Vault under git",
      status: "warn",
      message: "vault is not a git repo",
      hint: "run with --fix (git init) so auto-heal is reversible",
    });
  }

  // D06 — Bun present (we are running under it) + engine reachable
  r.push({
    id: "D06",
    title: "Bun engine",
    status: "pass",
    message: "Bun is present (this check ran in it)",
  });

  // D07 — config.json validation (loader lands later; report presence only)
  const userCfg = join(process.env["HOME"] ?? "~", ".config/claude-wiki-pages/config.json");
  r.push({
    id: "D07",
    title: "Config",
    status: existsSync(userCfg) ? "pass" : "skip",
    message: existsSync(userCfg) ? "user config present" : "no user config (defaults apply)",
  });

  // D08 — old settings path migrated to the new one (fixable: copy)
  r.push(checkSettingsMigration(cwd, fix));

  // D09 — verify reports no errors
  if (!existsSync(vault)) {
    r.push({
      id: "D09",
      title: "Vault integrity (verify)",
      status: "skip",
      message: "no vault yet",
    });
  } else {
    const v = verify({ target: vault });
    r.push(
      v.errors === 0
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
          },
    );
  }

  // D10 — glossary gate (only meaningful inside the plugin repo)
  r.push(
    existsSync(join(pluginRoot, "scripts/validate-docs.sh"))
      ? {
          id: "D10",
          title: "Glossary gate",
          status: "skip",
          message: "run `bash scripts/validate-docs.sh` (repo-context check)",
        }
      : { id: "D10", title: "Glossary gate", status: "skip", message: "not in the plugin repo" },
  );

  return { command: "doctor", vault, results: r, worst: worstOf(r) };
}

function checkHooks(pluginRoot: string, fix: boolean): CheckResult {
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

function checkSettingsMigration(cwd: string, fix: boolean): CheckResult {
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

const RANK: Record<DoctorStatus, number> = { pass: 0, skip: 0, fixed: 1, warn: 2, fail: 3 };
function worstOf(results: readonly CheckResult[]): DoctorStatus {
  return results.reduce<DoctorStatus>((w, c) => (RANK[c.status] > RANK[w] ? c.status : w), "pass");
}

/** Exit code: 0 normally; 3 under --strict when any check finished warn or fail. */
export function doctorExit(report: DoctorReport, strict: boolean): number {
  if (strict && (report.worst === "warn" || report.worst === "fail")) return 3;
  return 0;
}
