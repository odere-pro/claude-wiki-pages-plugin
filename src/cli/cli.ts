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
import { renderText, exitCode, type Report } from "../core/report.ts";

const IMPLEMENTED = new Set(["verify"]);
const PLANNED = [
  "index",
  "link-suggest",
  "search",
  "fix",
  "doctor",
  "config",
  "checkpoint",
  "heal",
];
const ALL = [...IMPLEMENTED, ...PLANNED];

interface ParsedArgs {
  readonly command: string | undefined;
  readonly json: boolean;
  readonly target: string | undefined;
  readonly help: boolean;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let command: string | undefined;
  let json = false;
  let target: string | undefined;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--help" || a === "-h") help = true;
    else if (a === "--target") target = argv[++i];
    else if (a && !a.startsWith("-") && command === undefined) command = a;
  }
  return { command, json, target, help };
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
      "Implemented: verify",
      "",
    ].join("\n"),
  );
}

function main(): number {
  const { command, json, target, help } = parseArgs(process.argv.slice(2));

  if (help || command === undefined) {
    usage();
    return command === undefined && !help ? 1 : 0;
  }

  if (command === "verify") {
    const report = verify({ target });
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

process.exit(main());
