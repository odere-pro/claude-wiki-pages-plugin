/** Filesystem helpers used by the verifiers. All sorted for deterministic output. */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Bookkeeping basenames (without extension) that the verifiers skip. */
export const BOOKKEEPING = new Set(["index", "log", "dashboard", "manifest", "_index", ".gitkeep"]);

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
