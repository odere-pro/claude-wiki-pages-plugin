/**
 * `fix` — deterministic, idempotent repair of the safe structural drift the
 * verifier reports. Bounded on purpose: it touches only what has exactly one
 * correct value (index duplicates, a folder missing its index file, index
 * children lists). Judgment repairs — schema_version, plain-string sources, body prose,
 * synthesis — are left to the curator agent / human.
 *
 * Running `fix` twice on a clean tree produces no change (the heal loop and the
 * polish-agent idempotency guarantee both depend on this).
 */

import { writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  listMarkdownRecursive,
  listMarkdownShallow,
  listSubdirs,
  readFileSafe,
  existsSync,
  isFolderNote,
  indexFileOf,
} from "../../core/fs.ts";
import { titleOf } from "../../core/frontmatter.ts";
import { resolveVault } from "../../core/vault.ts";
import { dedupeIndexLinks, syncChildren, buildIndexStub } from "../../core/moc-build.ts";

const SPECIAL_TOPIC_FOLDERS = new Set(["_sources", "_synthesis"]);

export interface FixChange {
  readonly file: string;
  readonly action: "dedupe-index" | "create-index" | "sync-children";
}

export interface FixReport {
  readonly command: "fix";
  readonly vault: string;
  readonly changes: readonly FixChange[];
  readonly changed: number;
}

export interface FixOptions {
  readonly target?: string;
  readonly cwd?: string;
  /** ISO date (YYYY-MM-DD) stamped into any newly created folder note. */
  readonly today?: string;
}

function folderPageTitles(folder: string): string[] {
  return listMarkdownShallow(folder)
    .filter((p) => basename(p) !== "_index.md" && !isFolderNote(p))
    .map((p) => titleOf(readFileSafe(p) ?? "", p));
}

/** Directories under wiki that must carry an index file (excludes _sources/_synthesis subtrees). */
function indexableDirs(wiki: string): string[] {
  const out: string[] = [];
  for (const top of listSubdirs(wiki)) {
    if (SPECIAL_TOPIC_FOLDERS.has(basename(top))) continue;
    out.push(top);
    const walk = (d: string): void => {
      for (const sub of listSubdirs(d)) {
        out.push(sub);
        walk(sub);
      }
    };
    walk(top);
  }
  return out;
}

export function fix(opts: FixOptions = {}): FixReport {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const wiki = join(vault, "wiki");
  const changes: FixChange[] = [];

  if (!existsSync(wiki)) return { command: "fix", vault, changes, changed: 0 };

  // 1. index.md — drop duplicate wikilink bullets.
  const indexPath = join(wiki, "index.md");
  const indexContent = readFileSafe(indexPath);
  if (indexContent !== null) {
    const deduped = dedupeIndexLinks(indexContent);
    if (deduped !== indexContent) {
      writeFileSync(indexPath, deduped);
      changes.push({ file: indexPath, action: "dedupe-index" });
    }
  }

  // 2. Create a missing index file for every indexable directory. New indexes
  //    are always created under the FOLDER NOTE name (`<dir>/<dirname>.md`),
  //    never `_index.md`. An existing legacy `_index.md` is accepted as-is —
  //    renaming it is `migrate`'s job, never fix's.
  for (const dir of indexableDirs(wiki)) {
    if (indexFileOf(dir) !== null) continue;
    const idx = join(dir, `${basename(dir)}.md`);
    // The folder-note name is taken by a regular page (no `type: index`) —
    // creating an index here needs judgment; leave it to the curator/human.
    if (existsSync(idx)) continue;
    writeFileSync(idx, buildIndexStub(basename(dir), folderPageTitles(dir), today));
    changes.push({ file: idx, action: "create-index" });
  }

  // 3. Sync children frontmatter on every index file to the folder's actual pages.
  for (const idx of listMarkdownRecursive(wiki).filter(
    (p) => basename(p) === "_index.md" || isFolderNote(p),
  )) {
    const content = readFileSafe(idx);
    if (content === null) continue;
    const synced = syncChildren(content, folderPageTitles(dirname(idx)));
    if (synced !== content) {
      writeFileSync(idx, synced);
      changes.push({ file: idx, action: "sync-children" });
    }
  }

  return { command: "fix", vault, changes, changed: changes.length };
}
