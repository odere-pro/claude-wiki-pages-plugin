/**
 * `export` — export wiki pages as plain markdown.
 *
 * Thin-wraps the logic of scripts/distribute-wiki.sh in the Bun/TS engine.
 * Produces either:
 *   - single-file mode (default): <vault>/output/wiki.md
 *     All wiki pages concatenated, frontmatter stripped, wikilinks flattened
 *     (or converted to [text](slug.md) with --links).
 *   - tree mode (--tree): <vault>/output/wiki/
 *     One file per wiki page, mirroring the source paths under wiki/.
 *
 * Output lives under <vault>/output/ which is schema-free, git-ignored scratch
 * space per vault/CLAUDE.md — no hook or validator touches it.
 *
 * The section ordering in single-file mode is deterministic and matches the
 * bash script's collect_paths() logic:
 *   1. wiki/index.md (always-first)
 *   2. wiki/log.md (always-second)
 *   3. Topic folders (sorted), each with its folder note or _index.md first,
 *      then its children (sorted). Dirs named _sources / _synthesis / _* skip.
 *   4. wiki/_sources/ (sorted)
 *   5. wiki/_synthesis/ (sorted)
 *
 * Migration unit: scripts/distribute-wiki.sh → this module.
 * See tmp/migration-plan.md Phase 1 and TEAM-BRIEF §3.
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readdirSync,
  statSync,
  readFileSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { splitFrontmatter } from "../../core/frontmatter.ts";
import { resolveVault } from "../../core/vault.ts";

// ── Public types ─────────────────────────────────────────────────────────────

export interface ExportOptions {
  /** Explicit vault path; overrides four-tier resolution. */
  readonly target?: string;
  /** Convert [[Title]] to [Title](title-slug.md) instead of flattening. */
  readonly links?: boolean;
  /** Write a mirror-tree of files instead of one consolidated file. */
  readonly tree?: boolean;
  /** Remove the existing output target before writing. */
  readonly clean?: boolean;
  /** Override the working directory for vault resolution. */
  readonly cwd?: string;
}

export interface ExportReport {
  readonly command: "export";
  readonly vault: string;
  /** true when export completed without error. */
  readonly ok: boolean;
  /** 'single' = consolidated file, 'tree' = mirrored directory. */
  readonly mode: "single" | "tree";
  /** Number of wiki pages written. */
  readonly count: number;
  /** Absolute path to the output file (single) or directory (tree). */
  readonly output: string;
  /** Human-readable status message (matches scripts/distribute-wiki.sh READY: prefix). */
  readonly message: string;
}

// ── Wikilink transformation ───────────────────────────────────────────────────

/**
 * Convert a wikilink label to a URL slug.
 * Mirrors the awk slug logic in scripts/distribute-wiki.sh:
 *   tolower(label) → gsub(/[^a-z0-9]+/, "-") → strip leading/trailing hyphens.
 */
function toSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Replace all [[Target]] and [[Target|Display]] wikilinks in a line.
 * --links mode: [[Target]] → [Target](target-slug.md)
 *               [[Target|Display]] → [Display](target-slug.md)
 * default mode: [[Target]] → Target
 *               [[Target|Display]] → Display
 */
function transformLine(line: string, links: boolean): string {
  return line.replace(/\[\[([^\]]+)\]\]/g, (_match, inner: string) => {
    const pipeIdx = inner.indexOf("|");
    const target = pipeIdx >= 0 ? inner.slice(0, pipeIdx) : inner;
    const display = pipeIdx >= 0 ? inner.slice(pipeIdx + 1) : inner;
    if (links) {
      return `[${display}](${toSlug(target)}.md)`;
    }
    return display;
  });
}

/** Strip YAML frontmatter and transform wikilinks in a file's content. */
function processContent(raw: string, links: boolean): string {
  const { body } = splitFrontmatter(raw);
  return body
    .split("\n")
    .map((line) => transformLine(line, links))
    .join("\n");
}

// ── Folder-note detection ──────────────────────────────────────────────────────

const FOLDER_NOTE_TYPE = /^type:[ \t]*["']?index["']?[ \t]*$/m;

function isFolderNote(filePath: string): boolean {
  if (!filePath.endsWith(".md")) return false;
  const stem = basename(filePath, ".md");
  if (stem !== basename(dirname(filePath))) return false;
  try {
    const content = readFileSync(filePath, "utf8");
    return FOLDER_NOTE_TYPE.test(content);
  } catch {
    return false;
  }
}

// ── Deterministic path collection (single-file mode) ─────────────────────────

/**
 * Collect wiki pages in the deterministic section order that mirrors
 * scripts/distribute-wiki.sh collect_paths().
 */
function collectPaths(wiki: string): string[] {
  const paths: string[] = [];

  // 1. Always-first files.
  const indexMd = join(wiki, "index.md");
  if (existsSync(indexMd)) paths.push(indexMd);

  const logMd = join(wiki, "log.md");
  if (existsSync(logMd)) paths.push(logMd);

  // 2. Topic folders (sorted), skip _* dirs and meta dirs.
  if (existsSync(wiki)) {
    const dirs = readdirSync(wiki)
      .filter((name) => {
        const full = join(wiki, name);
        return statSync(full).isDirectory();
      })
      .sort();

    for (const dirName of dirs) {
      // Skip _sources, _synthesis, and any _* folder.
      if (dirName.startsWith("_")) continue;

      const dirFull = join(wiki, dirName);

      // Folder note: <dir>/<dirName>.md with type: index.
      const folderNotePath = join(dirFull, `${dirName}.md`);
      const legacyIndexPath = join(dirFull, "_index.md");

      if (existsSync(folderNotePath) && isFolderNote(folderNotePath)) {
        paths.push(folderNotePath);
      } else if (existsSync(legacyIndexPath)) {
        paths.push(legacyIndexPath);
      }

      // Children: all .md files excluding the folder note / _index.md (sorted).
      const children = readdirSync(dirFull)
        .filter((name) => name.endsWith(".md"))
        .sort()
        .map((name) => join(dirFull, name))
        .filter((f) => {
          // Exclude the folder note / legacy index already added above.
          if (existsSync(folderNotePath) && isFolderNote(folderNotePath) && f === folderNotePath)
            return false;
          if (f === legacyIndexPath) return false;
          return true;
        });

      for (const child of children) {
        paths.push(child);
      }
    }
  }

  // 3. _sources/ (sorted).
  const sources = join(wiki, "_sources");
  if (existsSync(sources)) {
    const files = readdirSync(sources)
      .filter((n) => n.endsWith(".md"))
      .sort()
      .map((n) => join(sources, n));
    for (const f of files) paths.push(f);
  }

  // 4. _synthesis/ (sorted).
  const synthesis = join(wiki, "_synthesis");
  if (existsSync(synthesis)) {
    const files = readdirSync(synthesis)
      .filter((n) => n.endsWith(".md"))
      .sort()
      .map((n) => join(synthesis, n));
    for (const f of files) paths.push(f);
  }

  return paths;
}

// ── Today's date for the export header ──────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Public handler ─────────────────────────────────────────────────────────────

/**
 * Export wiki pages from the resolved vault.
 *
 * Returns an ExportReport describing what was written.
 * Never throws — all errors become ok:false with a message.
 */
export function exportWiki(opts: ExportOptions = {}): ExportReport {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const links = opts.links ?? false;
  const tree = opts.tree ?? false;
  const clean = opts.clean ?? false;

  const wiki = join(vault, "wiki");

  if (!existsSync(wiki)) {
    return {
      command: "export",
      vault,
      ok: false,
      mode: tree ? "tree" : "single",
      count: 0,
      output: tree ? join(vault, "output", "wiki") : join(vault, "output", "wiki.md"),
      message: `ERROR: wiki directory not found at ${wiki}`,
    };
  }

  if (tree) {
    return exportTree(vault, wiki, links, clean);
  }
  return exportSingle(vault, wiki, links, clean);
}

// ── Tree mode ──────────────────────────────────────────────────────────────────

function exportTree(vault: string, wiki: string, links: boolean, clean: boolean): ExportReport {
  const dist = join(vault, "output", "wiki");

  if (clean && existsSync(dist)) {
    rmSync(dist, { recursive: true, force: true });
  }

  mkdirSync(dist, { recursive: true });

  // Collect all .md files recursively (sorted for determinism).
  const allFiles = listMarkdownRecursive(wiki);
  let count = 0;

  for (const src of allFiles) {
    const rel = relative(wiki, src);
    const out = join(dist, rel);
    mkdirSync(dirname(out), { recursive: true });

    const raw = readFileSafe(src);
    const processed = processContent(raw ?? "", links);
    writeFileSync(out, processed, "utf8");
    count++;
  }

  const message = `READY: ${count} pages written to ${dist} (tree mode)`;
  return Object.freeze({
    command: "export" as const,
    vault,
    ok: true,
    mode: "tree" as const,
    count,
    output: dist,
    message,
  });
}

// ── Single-file mode ───────────────────────────────────────────────────────────

function exportSingle(vault: string, wiki: string, links: boolean, clean: boolean): ExportReport {
  const outFile = join(vault, "output", "wiki.md");
  mkdirSync(dirname(outFile), { recursive: true });

  if (clean && existsSync(outFile)) {
    rmSync(outFile, { force: true });
  }

  const orderedPaths = collectPaths(wiki);

  const lines: string[] = [];
  lines.push("# Wiki Export\n");
  lines.push(`Generated from vault at \`${vault}\` on ${todayISO()}.\n`);
  lines.push("---\n");

  let count = 0;
  for (const src of orderedPaths) {
    const rel = relative(wiki, src);
    const raw = readFileSafe(src);
    const processed = processContent(raw ?? "", links);
    lines.push(`<!-- ${rel} -->\n`);
    lines.push(processed);
    lines.push("\n---\n");
    count++;
  }

  const output = lines.join("\n");
  writeFileSync(outFile, output, "utf8");

  const message = `READY: ${count} pages consolidated into ${outFile}`;
  return Object.freeze({
    command: "export" as const,
    vault,
    ok: true,
    mode: "single" as const,
    count,
    output: outFile,
    message,
  });
}

// ── Internal fs helpers (avoid depending on the shared fs.ts for portability) ──

function listMarkdownRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isFile() && name.endsWith(".md")) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}
