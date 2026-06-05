/**
 * Structured result model shared by every engine command.
 *
 * `Finding` mirrors the ERROR:/WARN: lines emitted by the bash verifiers
 * (scripts/verify-ingest.sh, scripts/check-wikilinks.sh) so the Bun port can
 * be checked against them line-for-line by the parity gate.
 */

/**
 * `info` mirrors the two bash `yellow` lines that are printed but intentionally
 * NOT counted (schema CLAUDE.md missing, no _sources/ dir) — informational
 * skips, not warnings. Counting them would diverge from scripts/verify-ingest.sh.
 */
export type Severity = "error" | "warn" | "info";

/** Doctor-style status (used by `doctor` in M5; defined here as the single source). */
export type Status = "pass" | "warn" | "fail" | "fixed" | "skip";

export interface Finding {
  readonly severity: Severity;
  /** Which check produced it, e.g. "schema", "index-duplicates", "moc". */
  readonly check: string;
  readonly message: string;
  /** Vault-relative or absolute path the finding concerns, when applicable. */
  readonly file?: string;
}

export interface Report {
  readonly command: string;
  readonly vault: string;
  readonly findings: readonly Finding[];
  readonly errors: number;
  readonly warnings: number;
  /** True when there are zero error-severity findings. */
  readonly clean: boolean;
  /**
   * Optional follow-up page paths for JSON consumers only (e.g. the analyst
   * agent reading structured output). `buildReport` does NOT set this field;
   * commands that want it extend the frozen Report with a spread. `renderText`
   * intentionally ignores it to preserve byte-identical parity with the bash
   * verifiers (gate-05).
   */
  readonly next?: readonly string[];
}

/** Build an immutable Report from a flat list of findings. */
export function buildReport(command: string, vault: string, findings: readonly Finding[]): Report {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warn").length;
  return Object.freeze({
    command,
    vault,
    findings: Object.freeze([...findings]),
    errors,
    warnings,
    clean: errors === 0,
  });
}

/** Process exit code matching scripts/verify-ingest.sh: 1 on any error, else 0. */
export function exitCode(report: Report): number {
  return report.errors > 0 ? 1 : 0;
}

/** Human-readable rendering, color-free for CI logs. */
export function renderText(report: Report): string {
  const tags: Record<Severity, string> = { error: "ERROR", warn: "WARN ", info: "INFO " };
  const lines: string[] = [];
  for (const f of report.findings) {
    const tag = tags[f.severity];
    // The message already embeds a location where the bash verifiers do; `file`
    // is structured metadata for JSON consumers and is intentionally not echoed
    // here, so text output matches scripts/verify-ingest.sh line-for-line.
    lines.push(`${tag} [${f.check}] ${f.message}`);
  }
  lines.push("");
  lines.push(`Errors:   ${report.errors}`);
  lines.push(`Warnings: ${report.warnings}`);
  lines.push(report.clean ? "OK: all checks passed" : "FAIL: fix errors before continuing");
  return lines.join("\n");
}
