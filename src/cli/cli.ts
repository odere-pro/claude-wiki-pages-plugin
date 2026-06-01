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
import { renderText, exitCode, type Report } from "../core/report.ts";

const IMPLEMENTED = new Set(["verify", "fix", "heal", "doctor"]);
const PLANNED = ["index", "link-suggest", "search", "config", "checkpoint"];
const ALL = [...IMPLEMENTED, ...PLANNED];

interface ParsedArgs {
  readonly command: string | undefined;
  readonly json: boolean;
  readonly target: string | undefined;
  readonly help: boolean;
  readonly fix: boolean;
  readonly strict: boolean;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let command: string | undefined;
  let json = false;
  let target: string | undefined;
  let help = false;
  let fixFlag = false;
  let strict = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--help" || a === "-h") help = true;
    else if (a === "--fix") fixFlag = true;
    else if (a === "--strict") strict = true;
    else if (a === "--target") target = argv[++i];
    else if (a && !a.startsWith("-") && command === undefined) command = a;
  }
  return { command, json, target, help, fix: fixFlag, strict };
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
      "Implemented: verify, fix, heal, doctor",
      "",
    ].join("\n"),
  );
}

function main(): number {
  const { command, json, target, help, fix: fixFlag, strict } = parseArgs(process.argv.slice(2));

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
