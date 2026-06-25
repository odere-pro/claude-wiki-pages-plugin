/**
 * Argument parsing for the engine CLI.
 *
 * Extracted from cli.ts (god-class / 800-line ceiling) so the router stays a thin
 * parse → dispatch → emit → exit pipeline. This module owns the parse concern:
 * the constrained-string value-objects, the `ParsedArgs` shape, the
 * `ParsedArgsBuilder`, and the left-to-right `parseArgs` scan.
 */

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

/**
 * Parses the colon-separated `--other-vaults` flag value into a readonly list
 * of non-empty vault root strings. Returns an empty list when the flag is
 * absent or blank.
 */
export function parseOtherVaults(otherVaults: string | undefined): readonly string[] {
  return otherVaults ? otherVaults.split(":").filter((v) => v.length > 0) : [];
}

export interface ParsedArgs {
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
  /** S3 cross-vault: parsed list of other registered vault roots (value-object, S18). */
  readonly otherVaults: readonly string[];
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
  /**
   * hook --gate frontmatter --cli: batch-validate every page under
   * `<vault>/wiki/` (the CLI/JSON mode of validate-frontmatter.sh) instead of
   * reading one PreToolUse write from stdin. Emits the `{"findings":[…]}`
   * envelope (with --json) or a human summary, exit 0/1/2.
   */
  readonly cli: boolean;
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
  private cli = false;

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
  setCli(): this {
    this.cli = true;
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
      otherVaults: parseOtherVaults(this.otherVaults),
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
      cli: this.cli,
    });
  }
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
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
    } else if (a === "--cli") b.setCli();
    else if (a && !a.startsWith("-")) b.addPositional(a);
  }
  return b.build();
}
