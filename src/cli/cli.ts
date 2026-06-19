#!/usr/bin/env bun
/**
 * claude-wiki-pages — the deterministic engine CLI.
 *
 * Router only; each subcommand lives under src/commands/<cmd>/. Every command
 * supports `--json` for agent consumption. In M1 only `verify` is implemented;
 * the remaining verbs are declared so the surface is stable and discoverable,
 * and are filled in over M3–M5.
 *
 * One source of truth: the CAPABILITIES table below. IMPLEMENTED, PLANNED, ALL,
 * usage(), and the capabilities verb all derive from it (ADR-0015 N1/N2/N3).
 */

import { verify } from "../commands/verify/verify.ts";
import { lint, resolveLintCheck } from "../commands/lint/lint.ts";
import { exportWiki } from "../commands/export/export.ts";
import { fix } from "../commands/fix/fix.ts";
import { heal } from "../commands/heal/heal.ts";
import { doctor, doctorExit } from "../commands/doctor/doctor.ts";
import { config, configExit, type ConfigSub } from "../commands/config/config.ts";
import { migrate } from "../commands/migrate/migrate.ts";
import { search } from "../commands/search/search.ts";
import { firewallCheck } from "../commands/firewall/firewall.ts";
import { backlog } from "../commands/backlog/backlog.ts";
import { propose, type ProposeSub } from "../commands/propose/propose.ts";
import { snapshot, type SnapshotSub } from "../commands/snapshot/snapshot.ts";
import { join as pathJoin } from "node:path";
import { buildReport, renderText, exitCode, type Report } from "../core/report.ts";
import { ontology, type OntologyReport } from "../commands/ontology/ontology.ts";
import { route } from "../commands/route/route.ts";
import { context, renderContextText } from "../commands/context/context.ts";
import { okf } from "../commands/okf/okf.ts";
import { runHookGate, resolveGateName } from "../commands/hook/hook.ts";

// ── One CAPABILITIES table — single source of truth (ADR-0015 N1, N2) ─────────
//
// Every consumer (IMPLEMENTED Set, PLANNED array, ALL, usage(), capabilities verb)
// derives from this table. Adding or retiring a verb is a one-line edit here;
// nothing else needs updating (the drift that existed at src/cli/cli.ts:23-36
// and :123 is eliminated). The table lives in-place (N2: YAGNI until a second
// consumer outside the router exists).

/** Status of a verb in the engine surface. */
export type VerbStatus = "implemented" | "planned";

/** One row in the CAPABILITIES table. */
export interface CapabilityEntry {
  readonly name: string;
  readonly status: VerbStatus;
}

/**
 * The machine-readable capabilities manifest shape (ADR-0015 N3 named typed model).
 * Emitted through the existing emit()/exitCode() path as a CapabilitiesReport.
 */
export interface CapabilitiesManifest {
  readonly verbs: readonly CapabilityEntry[];
}

/**
 * A Report carrying the capabilities manifest.
 * Extends Report so it flows through emit() unchanged.
 * JSON.stringify includes the manifest field automatically.
 * renderText() ignores it (verify-parity preserved).
 */
export interface CapabilitiesReport extends Report {
  readonly manifest: CapabilitiesManifest;
}

/**
 * THE single source of truth for the verb surface.
 * IMPLEMENTED, PLANNED, ALL, usage(), and the capabilities verb all derive from it.
 */
export const CAPABILITIES: readonly CapabilityEntry[] = [
  { name: "verify", status: "implemented" },
  { name: "fix", status: "implemented" },
  { name: "heal", status: "implemented" },
  { name: "doctor", status: "implemented" },
  { name: "config", status: "implemented" },
  { name: "migrate", status: "implemented" },
  { name: "search", status: "implemented" },
  { name: "firewall", status: "implemented" },
  { name: "backlog", status: "implemented" },
  { name: "propose", status: "implemented" },
  { name: "capabilities", status: "implemented" },
  { name: "ontology", status: "implemented" },
  { name: "route", status: "implemented" },
  { name: "snapshot", status: "implemented" },
  { name: "context", status: "implemented" },
  { name: "okf", status: "implemented" },
  { name: "lint", status: "implemented" },
  { name: "export", status: "implemented" },
  { name: "hook", status: "implemented" },
  { name: "index", status: "planned" },
  { name: "link-suggest", status: "planned" },
] as const;

// Derived views — no independent Set/array that can drift from the table.
const PLANNED = CAPABILITIES.filter((e) => e.status === "planned").map((e) => e.name);
const ALL = CAPABILITIES.map((e) => e.name);

/**
 * Build the capabilities Report + manifest (ADR-0015 N3).
 * Exits 0 on success (clean enumeration); a future malformed-table condition
 * would exit non-zero via exitCode(). Exported for testing.
 */
export function capabilitiesReport(): CapabilitiesReport {
  const manifest: CapabilitiesManifest = {
    verbs: CAPABILITIES.map((e) => ({ name: e.name, status: e.status })),
  };
  const base = buildReport("capabilities", "", []);
  return Object.freeze({ ...base, manifest: Object.freeze(manifest) });
}

// ── Value-objects for constrained string fields (A01 — encapsulation) ─────────
//
// Raw strings standing in for a constrained domain concept are replaced by
// explicit union types. These are value-objects: they carry no methods, only a
// type constraint that the compiler enforces at every call site, preventing
// invalid enum values from leaking into command handlers.

/**
 * Ollama reachability status, as reported by scripts/reachability.sh.
 * "unprobed" is the default when the flag is omitted — the router treats it
 * as "not up" (conservative / Claude-favouring fallback).
 */
export type OllamaStatus = "up" | "down" | "unprobed";

/**
 * Claude API reachability status, as reported by scripts/reachability.sh.
 * "unprobed" is the default when the flag is omitted — the router treats it
 * as "reachable" (conservative / Claude-favouring fallback, ADR-0018).
 */
export type ClaudeStatus = "reachable" | "unreachable" | "unprobed";

/** Parse a raw --ollama flag value into the typed OllamaStatus value-object. */
function parseOllamaStatus(raw: string | undefined): OllamaStatus {
  if (raw === "up" || raw === "down") return raw;
  return "unprobed";
}

/** Parse a raw --claude flag value into the typed ClaudeStatus value-object. */
function parseClaudeStatus(raw: string | undefined): ClaudeStatus {
  if (raw === "reachable" || raw === "unreachable") return raw;
  return "unprobed";
}

interface ParsedArgs {
  readonly command: string | undefined;
  readonly sub: string | undefined;
  readonly json: boolean;
  readonly target: string | undefined;
  readonly help: boolean;
  readonly fix: boolean;
  readonly strict: boolean;
  readonly write: boolean;
  /** export: render [[Title]] as [Title](slug.md) instead of flattening. */
  readonly links: boolean;
  /** export: mirror-tree mode (one file per page). */
  readonly tree: boolean;
  /** export: remove the existing output target before writing. */
  readonly clean: boolean;
  readonly file: string | undefined;
  /** R1 candidate filter: frontmatter `type` exact match. */
  readonly type: string | undefined;
  /** R1 candidate filter: vault-relative path prefix. */
  readonly folder: string | undefined;
  /** R1 candidate filter (best-effort): `tags` membership. */
  readonly tag: string | undefined;
  /** R2 graph expansion: opt-in N≤2 link-walk over sources/related/depends_on. */
  readonly graph: boolean;
  /** S3 cross-vault: colon-separated list of other registered vault roots. */
  readonly otherVaults: string | undefined;
  /** route: Ollama reachability value-object (OllamaStatus). */
  readonly ollama: OllamaStatus;
  /** route: Claude API reachability value-object (ClaudeStatus). */
  readonly claude: ClaudeStatus;
  /** snapshot: operation id stamped into the commit message. */
  readonly op: string | undefined;
  /** snapshot post: human-readable label for the committed write phase. */
  readonly label: string | undefined;
  /** context: skill or agent name whose SKILL.md carries the context contract. */
  readonly skill: string | undefined;
  /** lint: maximum parallel check workers (1–32); currently unused. */
  readonly concurrency: number | undefined;
  /** lint: which check to run (default: all). */
  readonly check: string | undefined;
  /** lint --check vocabulary: tag-usage floor (mirrors --min-tag-usage). */
  readonly minTagUsage: number | undefined;
  /** hook: which security gate to run (e.g. "frontmatter"). */
  readonly gate: string | undefined;
}

/**
 * Builder for ParsedArgs — accumulates flag values from a left-to-right argv
 * scan and produces a frozen ParsedArgs. Tames assembly of the 17-field struct
 * and ensures value-object constructors (OllamaStatus, ClaudeStatus) are the
 * single parse point — invalid raw strings never escape into command handlers.
 *
 * A01 corrective pattern: Builder + value-object (encapsulation).
 */
class ParsedArgsBuilder {
  private command: string | undefined = undefined;
  private sub: string | undefined = undefined;
  private json = false;
  private target: string | undefined = undefined;
  private help = false;
  private fixFlag = false;
  private strict = false;
  private write = false;
  private links = false;
  private tree = false;
  private clean = false;
  private file: string | undefined = undefined;
  private type: string | undefined = undefined;
  private folder: string | undefined = undefined;
  private tag: string | undefined = undefined;
  private graph = false;
  private otherVaults: string | undefined = undefined;
  private rawOllama: string | undefined = undefined;
  private rawClaude: string | undefined = undefined;
  private op: string | undefined = undefined;
  private label: string | undefined = undefined;
  private skill: string | undefined = undefined;
  private rawConcurrency: string | undefined = undefined;
  private rawCheck: string | undefined = undefined;
  private rawMinTagUsage: string | undefined = undefined;
  private gate: string | undefined = undefined;

  setJson(): this {
    this.json = true;
    return this;
  }
  setHelp(): this {
    this.help = true;
    return this;
  }
  setFix(): this {
    this.fixFlag = true;
    return this;
  }
  setStrict(): this {
    this.strict = true;
    return this;
  }
  setWrite(): this {
    this.write = true;
    return this;
  }
  setLinks(): this {
    this.links = true;
    return this;
  }
  setTree(): this {
    this.tree = true;
    return this;
  }
  setClean(): this {
    this.clean = true;
    return this;
  }
  setGraph(): this {
    this.graph = true;
    return this;
  }
  setTarget(v: string): this {
    this.target = v;
    return this;
  }
  setFile(v: string): this {
    this.file = v;
    return this;
  }
  setType(v: string): this {
    this.type = v;
    return this;
  }
  setFolder(v: string): this {
    this.folder = v;
    return this;
  }
  setTag(v: string): this {
    this.tag = v;
    return this;
  }
  setOtherVaults(v: string): this {
    this.otherVaults = v;
    return this;
  }
  setOllama(v: string): this {
    this.rawOllama = v;
    return this;
  }
  setClaude(v: string): this {
    this.rawClaude = v;
    return this;
  }
  setOp(v: string): this {
    this.op = v;
    return this;
  }
  setLabel(v: string): this {
    this.label = v;
    return this;
  }
  setSkill(v: string): this {
    this.skill = v;
    return this;
  }
  setConcurrency(v: string): this {
    this.rawConcurrency = v;
    return this;
  }
  setCheck(v: string): this {
    this.rawCheck = v;
    return this;
  }
  setMinTagUsage(v: string): this {
    this.rawMinTagUsage = v;
    return this;
  }
  setGate(v: string): this {
    this.gate = v;
    return this;
  }
  /**
   * Accept a bare (non-flag) positional token. The first bare token becomes
   * `command`; the second becomes `sub`. Subsequent bare tokens are ignored
   * (matches the original left-to-right scan semantics).
   */
  addPositional(v: string): this {
    if (this.command === undefined) {
      this.command = v;
    } else if (this.sub === undefined) {
      this.sub = v;
    }
    return this;
  }

  build(): ParsedArgs {
    return Object.freeze({
      command: this.command,
      sub: this.sub,
      json: this.json,
      target: this.target,
      help: this.help,
      fix: this.fixFlag,
      strict: this.strict,
      write: this.write,
      links: this.links,
      tree: this.tree,
      clean: this.clean,
      file: this.file,
      type: this.type,
      folder: this.folder,
      tag: this.tag,
      graph: this.graph,
      otherVaults: this.otherVaults,
      ollama: parseOllamaStatus(this.rawOllama),
      claude: parseClaudeStatus(this.rawClaude),
      op: this.op,
      label: this.label,
      skill: this.skill,
      concurrency:
        this.rawConcurrency !== undefined
          ? Number.isFinite(Number(this.rawConcurrency))
            ? Number(this.rawConcurrency)
            : undefined
          : undefined,
      check: this.rawCheck,
      minTagUsage:
        this.rawMinTagUsage !== undefined
          ? Number.isFinite(Number(this.rawMinTagUsage))
            ? Number(this.rawMinTagUsage)
            : undefined
          : undefined,
      gate: this.gate,
    });
  }
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const b = new ParsedArgsBuilder();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") b.setJson();
    else if (a === "--help" || a === "-h") b.setHelp();
    else if (a === "--fix") b.setFix();
    else if (a === "--strict") b.setStrict();
    else if (a === "--write") b.setWrite();
    else if (a === "--links") b.setLinks();
    else if (a === "--tree") b.setTree();
    else if (a === "--clean") b.setClean();
    else if (a === "--target") {
      const v = argv[++i];
      if (v) b.setTarget(v);
    } else if (a === "--file") {
      const v = argv[++i];
      if (v) b.setFile(v);
    } else if (a === "--type") {
      const v = argv[++i];
      if (v) b.setType(v);
    } else if (a === "--folder") {
      const v = argv[++i];
      if (v) b.setFolder(v);
    } else if (a === "--tag") {
      const v = argv[++i];
      if (v) b.setTag(v);
    } else if (a === "--graph") b.setGraph();
    else if (a === "--other-vaults") {
      const v = argv[++i];
      if (v) b.setOtherVaults(v);
    } else if (a === "--ollama") {
      const v = argv[++i];
      if (v) b.setOllama(v);
    } else if (a === "--claude") {
      const v = argv[++i];
      if (v) b.setClaude(v);
    } else if (a === "--op") {
      const v = argv[++i];
      if (v) b.setOp(v);
    } else if (a === "--label") {
      const v = argv[++i];
      if (v) b.setLabel(v);
    } else if (a === "--skill") {
      const v = argv[++i];
      if (v) b.setSkill(v);
    } else if (a === "--concurrency") {
      const v = argv[++i];
      if (v) b.setConcurrency(v);
    } else if (a === "--check") {
      const v = argv[++i];
      if (v) b.setCheck(v);
    } else if (a === "--min-tag-usage") {
      const v = argv[++i];
      if (v) b.setMinTagUsage(v);
    } else if (a === "--gate") {
      const v = argv[++i];
      if (v) b.setGate(v);
    } else if (a && !a.startsWith("-")) b.addPositional(a);
  }
  return b.build();
}

/**
 * Read the entire stdin body as a string (the PreToolUse tool-call JSON).
 * Returns "" when stdin is empty or unavailable — the hook gate then sees an
 * empty payload and allows (fail-open is the gate's own decision for an empty
 * file path, not a swallowed error: a malformed body still yields an empty
 * HookInput and a no-op allow, never a thrown exception).
 */
async function readStdin(): Promise<string> {
  try {
    return await new Response(Bun.stdin.stream()).text();
  } catch {
    return "";
  }
}

function emit(report: Report, json: boolean): void {
  process.stdout.write(json ? JSON.stringify(report, null, 2) + "\n" : renderText(report) + "\n");
}

function usage(): void {
  // Derives the verb list directly from CAPABILITIES — no hardcoded literal.
  // The status label is capitalised from the VerbStatus value at runtime.
  const statusLabel = (s: VerbStatus): string => s.charAt(0).toUpperCase() + s.slice(1);
  const byStatus = (s: VerbStatus): string =>
    CAPABILITIES.filter((e) => e.status === s)
      .map((e) => e.name)
      .join(", ");
  process.stdout.write(
    [
      "claude-wiki-pages — deterministic LLM-Wiki engine",
      "",
      "Usage: claude-wiki-pages <command> [--target <vault>] [--json]",
      "",
      `Commands: ${ALL.join(", ")}`,
      "",
      `${statusLabel("implemented")}: ${byStatus("implemented")}`,
      "",
    ].join("\n"),
  );
}

async function main(): Promise<number> {
  const {
    command,
    sub,
    json,
    target,
    help,
    fix: fixFlag,
    strict,
    write,
    file,
    type,
    folder,
    tag,
    graph,
    otherVaults,
    ollama,
    claude,
    op,
    label,
    skill,
    concurrency,
    check,
    minTagUsage,
    links,
    tree,
    clean,
    gate,
  } = parseArgs(process.argv.slice(2));

  if (help || command === undefined) {
    usage();
    return command === undefined && !help ? 1 : 0;
  }

  if (command === "verify") {
    const report = await verify({ target, concurrency });
    emit(report, json);
    return exitCode(report);
  }

  // lint verb — structural lint of a vault.
  // `--check <name>` selects a specific check (default: all).
  // `--concurrency <n>` 1 = serial fallback for debuggability; default = parallel.
  if (command === "lint") {
    const report = await lint({
      target,
      concurrency,
      check: resolveLintCheck(check),
      minTagUsage,
      file,
    });
    emit(report, json);
    return exitCode(report);
  }

  // export verb — render the wiki as portable markdown under <vault>/output/.
  // Migrated from scripts/distribute-wiki.sh; --links/--tree/--clean mirror it.
  if (command === "export") {
    const report = exportWiki({ target, links, tree, clean });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else process.stdout.write(report.message + "\n");
    return report.ok ? 0 : 1;
  }

  if (command === "doctor") {
    const report = await doctor({ target, fix: fixFlag });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else {
      const glyph: Record<string, string> = {
        pass: "[ok]",
        warn: "[!!]",
        fail: "[XX]",
        fixed: "[fx]",
        skip: "[--]",
      };
      for (const c of report.results) {
        process.stdout.write(
          `${glyph[c.status]} ${c.id} ${c.title} — ${c.message}${c.hint ? `\n         ↳ ${c.hint}` : ""}\n`,
        );
      }
      process.stdout.write(`\nworst: ${report.worst}\n`);
    }
    return doctorExit(report, strict);
  }

  if (command === "fix") {
    const report = fix({ target });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else
      process.stdout.write(
        report.changed === 0
          ? "fix: nothing to repair\n"
          : report.changes.map((c) => `FIXED [${c.action}] ${c.file}`).join("\n") +
              `\nfixed ${report.changed} file(s)\n`,
      );
    return 0;
  }

  if (command === "heal") {
    const report = await heal({ target });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else
      process.stdout.write(
        [
          `heal: errors ${report.errorsBefore} → ${report.errorsAfter} in ${report.iterations} iteration(s)`,
          report.checkpoint ? `checkpoint: ${report.checkpoint}` : "",
          report.healCommit
            ? `healed: ${report.healCommit} (rollback: git revert ${report.healCommit})`
            : "",
          report.clean
            ? "OK: vault is clean"
            : `UNRESOLVED (needs curator/human):\n  - ${report.unresolved.join("\n  - ")}`,
          "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    return report.clean ? 0 : 1;
  }

  if (command === "config") {
    const allowed: ConfigSub[] = ["show", "validate", "path"];
    const chosen = (allowed.includes(sub as ConfigSub) ? sub : "show") as ConfigSub;
    const report = config({ sub: chosen });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else if (chosen === "path")
      process.stdout.write(
        `user:    ${report.paths.user} (${report.loaded.user ? "present" : "default"})\nproject: ${report.paths.project} (${report.loaded.project ? "present" : "absent"})\n`,
      );
    else if (chosen === "validate")
      process.stdout.write(
        report.errors.length === 0
          ? "OK: config is valid\n"
          : "INVALID:\n  - " + report.errors.join("\n  - ") + "\n",
      );
    else process.stdout.write(JSON.stringify(report.config, null, 2) + "\n");
    // Fail-closed local-model allow-list: surface on stderr for any subcommand
    // (text mode) so an unapproved enabled model is loud, not just in --json.
    if (!json && report.localModelErrors.length > 0)
      process.stderr.write(
        "BLOCKED (local model):\n  - " + report.localModelErrors.join("\n  - ") + "\n",
      );
    return configExit(report);
  }

  if (command === "migrate") {
    const report = migrate({ target, write });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else {
      const lines = report.changes.map(
        (c) => `${report.applied ? "MIGRATED" : "PLAN"} [${c.action}] ${c.file}`,
      );
      process.stdout.write((lines.length ? lines.join("\n") + "\n" : "") + report.message + "\n");
    }
    return report.message.startsWith("Vault not found") || report.message.startsWith("No CLAUDE.md")
      ? 1
      : 0;
  }

  // hook verb — the firewall-adjacent entry: read the PreToolUse tool-call JSON
  // from stdin, run the named security gate, and emit the
  // {"decision":"block","reason":…} contract on a block (else nothing). Always
  // exits 0 — the block is signalled by the stdout JSON, not the exit code
  // (matching every PreToolUse hook except enforce-dmi). The bash wrappers stay
  // fail-closed: when Bun is absent they emit the block themselves, never
  // reaching this code.
  if (command === "hook") {
    const gateName = resolveGateName(gate);
    if (gateName === undefined) {
      process.stderr.write(`hook: --gate <name> is required (known: frontmatter, firewall)\n`);
      return 2;
    }
    const stdin = await readStdin();
    const otherVaultsList: readonly string[] = otherVaults
      ? otherVaults.split(":").filter((v) => v.length > 0)
      : [];
    const result = runHookGate({ gate: gateName, stdin, target, otherVaults: otherVaultsList });
    if (result.block && result.reason !== undefined) {
      process.stdout.write(JSON.stringify({ decision: "block", reason: result.reason }) + "\n");
    }
    return 0;
  }

  if (command === "firewall") {
    if (!file) {
      process.stderr.write("firewall: --file <path> is required\n");
      return 2;
    }
    const otherVaultsList: readonly string[] = otherVaults
      ? otherVaults.split(":").filter((v) => v.length > 0)
      : [];
    const report = firewallCheck({ target, file, otherVaults: otherVaultsList });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else
      process.stdout.write(
        `${report.allowed ? "ALLOW" : "BLOCK"} [${report.matchedRule}] ${report.file} (mode=${report.mode})\n`,
      );
    return report.allowed ? 0 : 1;
  }

  if (command === "propose") {
    const allowed: ProposeSub[] = ["review", "approve", "reject"];
    const chosen = (allowed.includes(sub as ProposeSub) ? sub : "review") as ProposeSub;
    const report = propose({ target, sub: chosen, file });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else if (chosen === "review")
      process.stdout.write(
        (report.drafts.length
          ? report.drafts
              .map(
                (d) =>
                  `${d.ready ? "[ready]" : "[hold] "} ${d.target}${d.issues.length ? `  (${d.issues.join(", ")})` : ""}`,
              )
              .join("\n") + "\n"
          : "") +
          report.message +
          "\n",
      );
    else process.stdout.write(report.message + "\n");
    return report.message.includes("not found") || report.message.includes("requires --file")
      ? 1
      : 0;
  }

  // snapshot verb — git-bound an LLM write phase (pre = checkpoint, post = commit).
  // Reports only; always exits 0 so a wrapper or agent is never blocked by it.
  if (command === "snapshot") {
    const allowed: SnapshotSub[] = ["pre", "post"];
    if (!allowed.includes(sub as SnapshotSub)) {
      process.stderr.write("snapshot: requires a subcommand — pre | post\n");
      return 2;
    }
    const report = snapshot({ sub: sub as SnapshotSub, target, opId: op, label });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else process.stdout.write(report.message + "\n");
    return 0;
  }

  if (command === "backlog") {
    const report = backlog({ target });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else
      process.stdout.write(
        [
          `pending raw: ${report.pendingRaw.length}`,
          ...report.pendingRaw.map((p) => `  - ${p}`),
          `last ingest: ${report.lastIngest ?? "never"}`,
          `last lint:   ${report.lastLint ?? "never"}${report.daysSinceLint !== null ? ` (${report.daysSinceLint}d ago)` : ""}`,
          `needs catch-up: ${report.needsCatchup ? "yes" : "no"}`,
          ...(report.wiredChanges ?? []).map(
            (w) => `wired changes: ${w.name} ${w.changed} doc(s) since last sync`,
          ),
          "",
        ].join("\n"),
      );
    return 0;
  }

  if (command === "search") {
    const report = search({ target, query: sub ?? "", type, folder, tag, graph });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else if (report.hits.length === 0)
      process.stdout.write(`search: no matches for "${report.query}"\n`);
    else
      process.stdout.write(
        report.hits
          .map((h) => `${String(h.score).padStart(3)}  ${h.wikilink}  (${h.file})`)
          .join("\n") + "\n",
      );
    return 0;
  }

  // capabilities verb — serializes the CAPABILITIES table via emit()/exitCode() (ADR-0015 N3).
  if (command === "capabilities") {
    const report = capabilitiesReport();
    emit(report, json);
    return exitCode(report);
  }

  // ontology verb — projects ontology-profile-v1 via emit()/exitCode() (ADR-0015 N6, Part C).
  // Resolves the schema document from --target or falls back to skills/init/template/CLAUDE.md.
  if (command === "ontology") {
    // Resolve the schema path: the vault's CLAUDE.md is both the profile document
    // (contains ontology-profile-v1) and the vault-extension source for entity_type_extensions.
    // Fall back to the bundled example vault schema when no --target is given.
    const schemaPath = target
      ? pathJoin(target.replace(/\/+$/, ""), "CLAUDE.md")
      : pathJoin(import.meta.dir, "../../skills/init/template/CLAUDE.md");
    const vaultClaudeMd = target ? pathJoin(target.replace(/\/+$/, ""), "CLAUDE.md") : undefined;
    const report: OntologyReport = ontology({ schemaPath, vaultClaudeMd });
    emit(report, json);
    return exitCode(report);
  }

  // route verb — the deterministic degraded-mode routing decision (ADR-0018).
  // Reachability is passed in (--ollama / --claude); the command never probes.
  if (command === "route") {
    const report = route({ ollama, claude });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else
      process.stdout.write(
        `${report.decision} [tier=${report.tier}, policy=${report.offlinePolicy}] ${report.reason}\n`,
      );
    return exitCode(report);
  }

  // context verb — resolve the L0–L4 context set for a skill against the vault.
  if (command === "context") {
    const report = context({ target, skill });
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else process.stdout.write(renderContextText(report) + "\n");
    return 0;
  }

  // okf verb — OKF export / import subcommands.
  if (command === "okf") {
    const result = okf({ sub, target, write });
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    else process.stdout.write(result.message + "\n");
    return result.ok ? 0 : 1;
  }

  if (PLANNED.includes(command)) {
    const msg = {
      command,
      status: "not-implemented",
      message: `'${command}' lands in a later milestone (M3–M5).`,
    };
    process.stdout.write(
      json ? JSON.stringify(msg, null, 2) + "\n" : `${command}: not yet implemented (M3–M5)\n`,
    );
    return 0;
  }

  process.stderr.write(`Unknown command '${command}'. Known: ${ALL.join(", ")}\n`);
  return 2;
}

// Guard process.exit so this module is importable by tests without side effects.
// main() is async (verify + lint are async); resolve before exiting.
if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((err: unknown) => {
      process.stderr.write(String(err instanceof Error ? err.message : err) + "\n");
      process.exit(2);
    });
}
