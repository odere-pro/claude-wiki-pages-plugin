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
import { fix } from "../commands/fix/fix.ts";
import { heal } from "../commands/heal/heal.ts";
import { doctor, doctorExit } from "../commands/doctor/doctor.ts";
import { config, configExit, type ConfigSub } from "../commands/config/config.ts";
import { migrate } from "../commands/migrate/migrate.ts";
import { search } from "../commands/search/search.ts";
import { firewallCheck } from "../commands/firewall/firewall.ts";
import { backlog } from "../commands/backlog/backlog.ts";
import { propose, type ProposeSub } from "../commands/propose/propose.ts";
import { join as pathJoin } from "node:path";
import { buildReport, renderText, exitCode, type Report } from "../core/report.ts";
import { ontology, type OntologyReport } from "../commands/ontology/ontology.ts";

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
  { name: "index", status: "planned" },
  { name: "link-suggest", status: "planned" },
  { name: "checkpoint", status: "planned" },
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

interface ParsedArgs {
  readonly command: string | undefined;
  readonly sub: string | undefined;
  readonly json: boolean;
  readonly target: string | undefined;
  readonly help: boolean;
  readonly fix: boolean;
  readonly strict: boolean;
  readonly write: boolean;
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
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let command: string | undefined;
  let sub: string | undefined;
  let json = false;
  let target: string | undefined;
  let help = false;
  let fixFlag = false;
  let strict = false;
  let write = false;
  let file: string | undefined;
  let type: string | undefined;
  let folder: string | undefined;
  let tag: string | undefined;
  let graph = false;
  let otherVaults: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--help" || a === "-h") help = true;
    else if (a === "--fix") fixFlag = true;
    else if (a === "--strict") strict = true;
    else if (a === "--write") write = true;
    else if (a === "--target") target = argv[++i];
    else if (a === "--file") file = argv[++i];
    else if (a === "--type") type = argv[++i];
    else if (a === "--folder") folder = argv[++i];
    else if (a === "--tag") tag = argv[++i];
    else if (a === "--graph") graph = true;
    else if (a === "--other-vaults") otherVaults = argv[++i];
    else if (a && !a.startsWith("-") && command === undefined) command = a;
    else if (a && !a.startsWith("-") && sub === undefined) sub = a;
  }
  return {
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
  };
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

function main(): number {
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
  } = parseArgs(process.argv.slice(2));

  if (help || command === undefined) {
    usage();
    return command === undefined && !help ? 1 : 0;
  }

  if (command === "verify") {
    const report = verify({ target });
    emit(report, json);
    return exitCode(report);
  }

  if (command === "doctor") {
    const report = doctor({ target, fix: fixFlag });
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
    const report = heal({ target });
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
      process.stderr.write("BLOCKED (local model):\n  - " + report.localModelErrors.join("\n  - ") + "\n");
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
  // Resolves the schema document from --target or falls back to docs/vault-example/CLAUDE.md.
  if (command === "ontology") {
    // Resolve the schema path: the vault's CLAUDE.md is both the profile document
    // (contains ontology-profile-v1) and the vault-extension source for entity_type_extensions.
    // Fall back to the bundled example vault schema when no --target is given.
    const schemaPath = target
      ? pathJoin(target.replace(/\/+$/, ""), "CLAUDE.md")
      : pathJoin(import.meta.dir, "../../docs/vault-example/CLAUDE.md");
    const vaultClaudeMd = target ? pathJoin(target.replace(/\/+$/, ""), "CLAUDE.md") : undefined;
    const report: OntologyReport = ontology({ schemaPath, vaultClaudeMd });
    emit(report, json);
    return exitCode(report);
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
if (import.meta.main) {
  process.exit(main());
}
