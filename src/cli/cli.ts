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
import { runHookGate, resolveGateName, type GateName } from "../commands/hook/hook.ts";
import { frontmatterCli } from "../commands/hook/frontmatter-cli.ts";
import { type ParsedArgs, parseArgs } from "./args.ts";

// ── One CAPABILITIES table — single source of truth (ADR-0015 N1, N2) ─────────
//
// Every consumer (IMPLEMENTED Set, PLANNED array, ALL, usage(), capabilities verb)
// derives from this table. Adding or retiring a verb is a one-line edit here;
// nothing else needs updating (the drift that existed at src/cli/cli.ts:23-36
// and :123 is eliminated). The table lives in-place (N2: YAGNI until a second
// consumer outside the router exists).

/** Status of a verb in the engine surface. */
type VerbStatus = "implemented" | "planned";

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
interface CapabilitiesReport extends Report {
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

// ── Verb handler registry (facade corrective pattern, N01) ───────────────────
//
// Each implemented verb is a named handler: (args: ParsedArgs) => Promise<number> | number.
// main() looks up the registry and delegates — it no longer contains 19 if-branches.
// Adding a new verb is a one-function + one-entry change; nothing else in main() shifts.

async function handleVerify(args: ParsedArgs): Promise<number> {
  const report = await verify({ target: args.target, concurrency: args.concurrency });
  emit(report, args.json);
  return exitCode(report);
}

// lint verb — structural lint of a vault.
// `--check <name>` selects a specific check (default: all).
// `--concurrency <n>` 1 = serial fallback for debuggability; default = parallel.
async function handleLint(args: ParsedArgs): Promise<number> {
  const report = await lint({
    target: args.target,
    concurrency: args.concurrency,
    check: resolveLintCheck(args.check),
    minTagUsage: args.minTagUsage,
    file: args.file,
  });
  emit(report, args.json);
  return exitCode(report);
}

// export verb — render the wiki as portable markdown under <vault>/output/.
// Migrated from scripts/distribute-wiki.sh; --links/--tree/--clean mirror it.
function handleExport(args: ParsedArgs): number {
  const report = exportWiki({
    target: args.target,
    links: args.links,
    tree: args.tree,
    clean: args.clean,
  });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(report.message + "\n");
  return report.ok ? 0 : 1;
}

async function handleDoctor(args: ParsedArgs): Promise<number> {
  const report = await doctor({ target: args.target, fix: args.fix });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
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
  return doctorExit(report, args.strict);
}

function handleFix(args: ParsedArgs): number {
  const report = fix({ target: args.target });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else
    process.stdout.write(
      report.changed === 0
        ? "fix: nothing to repair\n"
        : report.changes.map((c) => `FIXED [${c.action}] ${c.file}`).join("\n") +
            `\nfixed ${report.changed} file(s)\n`,
    );
  return 0;
}

async function handleHeal(args: ParsedArgs): Promise<number> {
  const report = await heal({ target: args.target });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
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

function handleConfig(args: ParsedArgs): number {
  const allowed: ConfigSub[] = ["show", "validate", "path"];
  const chosen = (allowed.includes(args.sub as ConfigSub) ? args.sub : "show") as ConfigSub;
  const report = config({ sub: chosen });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
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
  if (!args.json && report.localModelErrors.length > 0)
    process.stderr.write(
      "BLOCKED (local model):\n  - " + report.localModelErrors.join("\n  - ") + "\n",
    );
  return configExit(report);
}

function handleMigrate(args: ParsedArgs): number {
  const report = migrate({ target: args.target, write: args.write });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
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

/**
 * CLI batch mode (frontmatter only) — replaces the awk validate_content loop
 * in scripts/validate-frontmatter.sh's `--target [--json]` modes
 * (frontmatter-cli-retire, tmp/migration-plan.md "What is left" #2).
 * Validates every page under <vault>/wiki/ and emits the {"findings":[…]}
 * envelope (--json) or a human summary.
 * Exit 2 (bad target) when wiki/ is absent, 1 when any page fails, else 0.
 */
function handleHookCli(gateName: string, args: ParsedArgs): number {
  if (gateName !== "frontmatter") {
    process.stderr.write(`hook --cli: only --gate frontmatter is supported\n`);
    return 2;
  }
  const resolvedVault = args.target ?? "";
  if (resolvedVault === "") {
    process.stderr.write(`hook --cli: --target <vault> is required\n`);
    return 2;
  }
  const result = frontmatterCli({ vault: resolvedVault });
  if (result.missingWiki) {
    // Bad target: the bash CLI emits {"findings":[]} (json) and exits 2.
    if (args.json) process.stdout.write(`{"findings":[]}\n`);
    return 2;
  }
  const errors = result.findings.length;
  if (args.json) {
    process.stdout.write(JSON.stringify({ findings: result.findings }) + "\n");
  } else {
    // Plain-text mode: one OK:/ERROR: line PER wiki page (the bash green/red
    // loop contract), not a single vault-level summary. Line-counting
    // consumers (scripts/eval-ingest-extract.sh:_score_schema, which requires
    // one ".md" line per page) depend on the per-file granularity
    // (frontmatter-cli-retire regression fix). The trailing summary line is
    // retained for the human reader.
    for (const f of result.files) {
      if (f.ok) process.stdout.write(`OK:    ${f.file}\n`);
      else process.stdout.write(`ERROR: ${f.file} — ${f.message ?? ""}\n`);
    }
    process.stdout.write(`\n`);
    if (errors > 0) process.stdout.write(`Errors:   ${errors}\n`);
    else process.stdout.write(`OK:    All frontmatter valid\n`);
  }
  return errors > 0 ? 1 : 0;
}

/**
 * Stdin PreToolUse mode — reads the tool-call JSON from stdin, runs the named
 * security gate, and emits the block decision (if any) on stdout.
 * Exits 0 for every gate except a dmi hard block (exits 2 via result.exitCode).
 */
async function handleHookStdin(gateName: GateName, args: ParsedArgs): Promise<number> {
  const stdin = await readStdin();
  const result = runHookGate({
    gate: gateName,
    stdin,
    target: args.target,
    otherVaults: args.otherVaults,
  });
  // Stdout block JSON (frontmatter/firewall/check-wikilinks/protect-raw/attachments).
  if (result.block && result.reason !== undefined) {
    process.stdout.write(JSON.stringify({ decision: "block", reason: result.reason }) + "\n");
  }
  // Stderr notice (dmi hard-block, must-rule advisory) written verbatim.
  if (result.stderr !== "") {
    process.stderr.write(result.stderr);
  }
  // Exit code: 0 for every gate except a dmi hard block (2).
  return result.exitCode;
}

async function handleHook(args: ParsedArgs): Promise<number> {
  const gateName = resolveGateName(args.gate);
  if (gateName === undefined) {
    process.stderr.write(
      `hook: --gate <name> is required (known: frontmatter, firewall, check-wikilinks, protect-raw, attachments, dmi, must-rule)\n`,
    );
    return 2;
  }
  if (args.cli) return handleHookCli(gateName, args);
  return handleHookStdin(gateName, args);
}

function handleFirewall(args: ParsedArgs): number {
  if (!args.file) {
    process.stderr.write("firewall: --file <path> is required\n");
    return 2;
  }
  const report = firewallCheck({
    target: args.target,
    file: args.file,
    otherVaults: args.otherVaults,
  });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else
    process.stdout.write(
      `${report.allowed ? "ALLOW" : "BLOCK"} [${report.matchedRule}] ${report.file} (mode=${report.mode})\n`,
    );
  return report.allowed ? 0 : 1;
}

function handlePropose(args: ParsedArgs): number {
  const allowed: ProposeSub[] = ["review", "approve", "reject"];
  const chosen = (allowed.includes(args.sub as ProposeSub) ? args.sub : "review") as ProposeSub;
  const report = propose({ target: args.target, sub: chosen, file: args.file });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
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
  return report.message.includes("not found") || report.message.includes("requires --file") ? 1 : 0;
}

// snapshot verb — git-bound an LLM write phase (pre = checkpoint, post = commit).
// Reports only; always exits 0 so a wrapper or agent is never blocked by it.
function handleSnapshot(args: ParsedArgs): number {
  const allowed: SnapshotSub[] = ["pre", "post"];
  if (!allowed.includes(args.sub as SnapshotSub)) {
    process.stderr.write("snapshot: requires a subcommand — pre | post\n");
    return 2;
  }
  const report = snapshot({
    sub: args.sub as SnapshotSub,
    target: args.target,
    opId: args.op,
    label: args.label,
  });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(report.message + "\n");
  return 0;
}

function handleBacklog(args: ParsedArgs): number {
  const report = backlog({ target: args.target });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
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

function handleSearch(args: ParsedArgs): number {
  const report = search({
    target: args.target,
    query: args.sub ?? "",
    type: args.type,
    folder: args.folder,
    tag: args.tag,
    graph: args.graph,
  });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
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
function handleCapabilities(args: ParsedArgs): number {
  const report = capabilitiesReport();
  emit(report, args.json);
  return exitCode(report);
}

// ontology verb — projects ontology-profile-v1 via emit()/exitCode() (ADR-0015 N6, Part C).
// Resolves the schema document from --target or falls back to skills/init/template/CLAUDE.md.
function handleOntology(args: ParsedArgs): number {
  // Resolve the schema path: the vault's CLAUDE.md is both the profile document
  // (contains ontology-profile-v1) and the vault-extension source for entity_type_extensions.
  // Fall back to the bundled example vault schema when no --target is given.
  const schemaPath = args.target
    ? pathJoin(args.target.replace(/\/+$/, ""), "CLAUDE.md")
    : pathJoin(import.meta.dir, "../../skills/init/template/CLAUDE.md");
  const vaultClaudeMd = args.target
    ? pathJoin(args.target.replace(/\/+$/, ""), "CLAUDE.md")
    : undefined;
  const report: OntologyReport = ontology({ schemaPath, vaultClaudeMd });
  emit(report, args.json);
  return exitCode(report);
}

// route verb — the deterministic degraded-mode routing decision (ADR-0018).
// Reachability is passed in (--ollama / --claude); the command never probes.
function handleRoute(args: ParsedArgs): number {
  const report = route({ ollama: args.ollama, claude: args.claude });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else
    process.stdout.write(
      `${report.decision} [tier=${report.tier}, policy=${report.offlinePolicy}] ${report.reason}\n`,
    );
  return exitCode(report);
}

// context verb — resolve the L0–L4 context set for a skill against the vault.
function handleContext(args: ParsedArgs): number {
  const report = context({ target: args.target, skill: args.skill });
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(renderContextText(report) + "\n");
  return 0;
}

// okf verb — OKF export / import subcommands.
function handleOkf(args: ParsedArgs): number {
  const result = okf({ sub: args.sub, target: args.target, write: args.write });
  if (args.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else process.stdout.write(result.message + "\n");
  return result.ok ? 0 : 1;
}

/**
 * Verb → handler registry (facade).
 * main() delegates here; adding a new implemented verb is a one-handler + one-entry change.
 */
const VERB_HANDLERS: Readonly<Record<string, (args: ParsedArgs) => Promise<number> | number>> =
  Object.freeze({
    verify: handleVerify,
    lint: handleLint,
    export: handleExport,
    doctor: handleDoctor,
    fix: handleFix,
    heal: handleHeal,
    config: handleConfig,
    migrate: handleMigrate,
    hook: handleHook,
    firewall: handleFirewall,
    propose: handlePropose,
    snapshot: handleSnapshot,
    backlog: handleBacklog,
    search: handleSearch,
    capabilities: handleCapabilities,
    ontology: handleOntology,
    route: handleRoute,
    context: handleContext,
    okf: handleOkf,
  });

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const { command, json, help } = args;

  if (help || command === undefined) {
    usage();
    return command === undefined && !help ? 1 : 0;
  }

  const handler = VERB_HANDLERS[command];
  if (handler !== undefined) {
    return handler(args);
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
      // Redact non-Error thrown values — serialising an unknown object via
      // String() may surface vault paths, config snippets, or other sensitive
      // data on stderr. Only err.message (author-controlled) is safe to emit.
      const msg = err instanceof Error ? err.message : "unexpected error (non-Error thrown)";
      process.stderr.write(msg + "\n");
      process.exit(2);
    });
}
