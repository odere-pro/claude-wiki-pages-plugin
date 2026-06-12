/**
 * Map-of-content (MOC) consistency — ports scripts/verify-ingest.sh CHECK 3,
 * CHECK 3b (orphan source summaries), and the trailing topic-folder check.
 */

import { basename, dirname, join } from "node:path";
import {
  listMarkdownRecursive,
  listMarkdownShallow,
  listSubdirs,
  readFileSafe,
  existsSync,
  isFolderNote,
  indexFileOf,
} from "./fs.ts";
import { parseFrontmatter, stringList, stripWikilink, titleOf } from "./frontmatter.ts";
import { declaredSchemaVersion } from "./schema.ts";
import type { Finding } from "./report.ts";

const SPECIAL_TOPIC_FOLDERS = new Set(["_sources", "_synthesis"]);

function titleAtPath(path: string): string {
  const content = readFileSafe(path) ?? "";
  return titleOf(content, path);
}

/** CHECK 3: each index file (folder note or legacy `_index.md`) must agree with its folder's pages and subfolders. */
export function checkIndexConsistency(wiki: string): Finding[] {
  const findings: Finding[] = [];
  const indexFiles = listMarkdownRecursive(wiki).filter(
    (p) => basename(p) === "_index.md" || isFolderNote(p),
  );

  for (const indexFile of indexFiles) {
    const folder = dirname(indexFile);
    const folderName = basename(folder);
    const indexName = basename(indexFile);
    const content = readFileSafe(indexFile) ?? "";
    const fm = parseFrontmatter(content);
    const children = stringList(fm["children"]).map(stripWikilink);

    const actualFiles = listMarkdownShallow(folder)
      .filter((p) => basename(p) !== "_index.md" && !isFolderNote(p))
      .map(titleAtPath);
    const actualSubdirs = listSubdirs(folder).map((d) => basename(d));

    // Pages present in the folder but missing from the index children list.
    for (const title of actualFiles) {
      if (children.length > 0) {
        if (!children.includes(title)) {
          findings.push({
            severity: "warn",
            check: "moc",
            message: `Page "${title}" in ${folderName}/ but not in ${folderName}/${indexName} children`,
            file: indexFile,
          });
        }
      } else {
        findings.push({
          severity: "warn",
          check: "moc",
          message: `Page "${title}" in ${folderName}/ but ${indexName} has empty children list`,
          file: indexFile,
        });
      }
    }

    // Children listed in the index with no matching page on disk.
    for (const child of children) {
      if (actualFiles.length > 0) {
        if (!actualFiles.includes(child)) {
          findings.push({
            severity: "error",
            check: "moc",
            message: `Index lists "${child}" but no matching page found in ${folderName}/`,
            file: indexFile,
          });
        }
      } else {
        findings.push({
          severity: "error",
          check: "moc",
          message: `Index lists "${child}" but folder ${folderName}/ has no pages`,
          file: indexFile,
        });
      }
    }

    // Every subfolder must carry its own index file (folder note or legacy _index.md).
    for (const subdir of actualSubdirs) {
      if (indexFileOf(join(folder, subdir)) === null) {
        findings.push({
          severity: "error",
          check: "moc",
          message: `Subfolder ${folderName}/${subdir}/ has no index file (folder note or _index.md)`,
          file: indexFile,
        });
      }
    }
  }
  return findings;
}

/** CHECK 3b: every `_sources/` summary must be cited by at least one wiki page. */
export function checkOrphanSources(wiki: string): Finding[] {
  const sourcesDir = join(wiki, "_sources");
  if (!existsSync(sourcesDir)) {
    return [
      {
        severity: "info",
        check: "orphan-sources",
        message: "No _sources/ directory found",
        file: sourcesDir,
      },
    ];
  }

  // Pages that may cite a source: all wiki markdown except _sources/, index.md, log.md.
  const citingPages = listMarkdownRecursive(wiki).filter(
    (p) =>
      !p.includes(`${join(wiki, "_sources")}/`) &&
      basename(p) !== "index.md" &&
      basename(p) !== "log.md",
  );
  const citingContents = citingPages.map((p) => readFileSafe(p) ?? "");

  const findings: Finding[] = [];
  const sources = listMarkdownShallow(sourcesDir).filter((p) => basename(p) !== ".gitkeep");
  for (const sourceFile of sources) {
    const title = titleAtPath(sourceFile);
    const needle = `[[${title}]]`;
    if (!citingContents.some((c) => c.includes(needle))) {
      findings.push({
        severity: "warn",
        check: "orphan-sources",
        message: `Orphan source: "${title}" (${basename(sourceFile)}) — not referenced by any wiki page`,
        file: sourceFile,
      });
    }
  }
  return findings;
}

/** Trailing check: each top-level topic folder (besides _sources/_synthesis) needs an index file. */
export function checkTopicFolders(wiki: string): Finding[] {
  const findings: Finding[] = [];
  for (const dir of listSubdirs(wiki)) {
    const name = basename(dir);
    if (SPECIAL_TOPIC_FOLDERS.has(name)) continue;
    if (indexFileOf(dir) === null) {
      findings.push({
        severity: "error",
        check: "topic-folder",
        message: `Topic folder ${name}/ has no index file (folder note or _index.md)`,
        file: dir,
      });
    }
  }
  return findings;
}

/**
 * Schema v3 deprecation: at `schema_version >= 3`, every remaining legacy
 * `wiki/**\/_index.md` gets a WARN pointing at the folder-note rename that
 * `migrate --write` applies. Older vaults (v1/v2) emit nothing — back-compat.
 */
export function checkLegacyIndexFilename(vault: string, wiki: string): Finding[] {
  const declared = declaredSchemaVersion(join(vault, "CLAUDE.md"));
  if (declared === null || declared < 3) return [];
  return listMarkdownRecursive(wiki)
    .filter((p) => basename(p) === "_index.md")
    .map((p) => ({
      severity: "warn" as const,
      check: "legacy-index-filename",
      message: `legacy-index-filename: ${p} uses the legacy _index.md name — rename to the folder note ${basename(dirname(p))}.md (run: bash scripts/engine.sh migrate --write)`,
      file: p,
    }));
}
