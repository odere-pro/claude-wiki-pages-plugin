#!/usr/bin/env bun
/**
 * claude-wiki-pages — the deterministic engine CLI.
 *
 * Router only; each subcommand lives under src/commands/<cmd>/. Every command
 * supports `--json` for agent consumption. In M1 only `verify` is implemented;
 * the remaining verbs are declared so the surface is stable and discoverable,
 * and are filled in over M3–M5.
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
import { renderText, exitCode, type Report } from "../core/report.ts";

const IMPLEMENTED = new Set([
  "verify",
  "fix",
  "heal",
  "doctor",
  "config",
  "migrate",
  "search",
  "firewall",
  "backlog",
  "propose",
]);
const PLANNED = ["index", "link-suggest", "checkpoint"];
const ALL = [...IMPLEMENTED, ...PLANNED];

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
    else if (a && !a.startsWith("-") && command === undefined) command = a;
    else if (a && !a.startsWith("-") && sub === undefined) sub = a;
  }
  return { command, sub, json, target, help, fix: fixFlag, strict, write, file, type, folder, tag };
}

function emit(report: Report, json: boolean): void {
  process.stdout.write(json ? JSON.stringify(report, null, 2) + "\n" : renderText(report) + "\n");
}

function usage(): void {
  process.stdout.write(
    [
      "claude-wiki-pages — deterministic LLM-Wiki engine",
      "",
      "Usage: claude-wiki-pages <command> [--target <vault>] [--json]",
      "",
      `Commands: ${ALL.join(", ")}`,
      "",
      "Implemented: verify, fix, heal, doctor, config, migrate, search, firewall, backlog, propose",
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
    const report = firewallCheck({ target, file });
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
    const report = search({ target, query: sub ?? "", type, folder, tag });
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

process.exit(main());
