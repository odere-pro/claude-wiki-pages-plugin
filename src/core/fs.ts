/**
 * Filesystem helpers used by the verifiers. All sorted for deterministic output.
 *
 * These are deliberately co-located deterministic listing primitives shared
 * engine-wide. The broad fan-in (9 commands + 6 core modules) is intentional
 * cohesion: the determinism non-negotiable (same vault in → same sorted list
 * out) is enforced here and inherited everywhere. No split is warranted unless
 * a genuinely orthogonal concern appears (KISS/YAGNI, TEAM-BRIEF §5).
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** Bookkeeping basenames (without extension) that the verifiers skip. */
export const BOOKKEEPING = new Set(["index", "log", "dashboard", "manifest", "_index", ".gitkeep"]);

/**
 * Frontmatter line marking a page as an index. Tested against the whole file
 * (per line) to stay byte-aligned with the bash twin's
 * `grep -Eq '^type:[[:space:]]*["'\'']?index["'\'']?[[:space:]]*$'`.
 */
const FOLDER_NOTE_TYPE = /^type:[ \t]*["']?index["']?[ \t]*$/m;

/**
 * Folder note (schema v3): the per-folder wiki index file whose filename stem
 * equals its parent directory name AND whose frontmatter declares `type: index`.
 * Both conditions are normative — `wiki/topics/topics.md` without `type: index`
 * is a regular page, not an index.
 */
export function isFolderNote(filePath: string): boolean {
  if (!filePath.endsWith(".md")) return false;
  const stem = basename(filePath, ".md");
  if (stem !== basename(dirname(filePath))) return false;
  const content = readFileSafe(filePath);
  return content !== null && FOLDER_NOTE_TYPE.test(content);
}

/**
 * True when the file is an index/bookkeeping page that page-level checks skip.
 * Legacy `_index.md` and folder notes classify identically everywhere.
 */
export function isBookkeepingFile(filePath: string): boolean {
  return BOOKKEEPING.has(basename(filePath, ".md")) || isFolderNote(filePath);
}

/**
 * The folder's index file: the folder note (`<dir>/<dirname>.md` with
 * `type: index`) when present, else legacy `_index.md` when present, else null.
 */
export function indexFileOf(folderPath: string): string | null {
  const note = join(folderPath, `${basename(folderPath)}.md`);
  if (existsSync(note) && isFolderNote(note)) return note;
  const legacy = join(folderPath, "_index.md");
  return existsSync(legacy) ? legacy : null;
}

/** Recursively list `*.md` files under `dir`, sorted. Returns [] if dir is absent. */
export function listMarkdownRecursive(dir: string): string[] {
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

/** List `*.md` files directly in `dir` (non-recursive), sorted. */
export function listMarkdownShallow(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".md") && statSync(join(dir, n)).isFile())
    .map((n) => join(dir, n))
    .sort();
}

/** List immediate subdirectories of `dir`, sorted. */
export function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => statSync(join(dir, n)).isDirectory())
    .map((n) => join(dir, n))
    .sort();
}

/** Read a file as UTF-8, or null if it cannot be read. */
export function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

export { existsSync };
