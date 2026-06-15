/**
 * Map-of-content (MOC) consistency — ports scripts/verify-ingest.sh CHECK 3,
 * CHECK 3b (orphan source summaries), and the trailing topic-folder check.
 */

import { basename, dirname, join, relative } from "node:path";
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
import { buildLinkIndex, resolveLink } from "./link-resolver.ts";
import { extractRawWikilinkTargets } from "./wikilink-check.ts";
import type { Finding } from "./report.ts";

/** Wiki-relative path with `/` separators (Obsidian's path form). */
function toRel(wiki: string, file: string): string {
  return relative(wiki, file).split(/[\\/]/).join("/");
}

const SPECIAL_TOPIC_FOLDERS = new Set(["_sources", "_synthesis"]);

function titleAtPath(path: string): string {
  const content = readFileSafe(path) ?? "";
  return titleOf(content, path);
}

/** CHECK 3: each index file (folder note or legacy `_index.md`) must agree with its folder's pages and subfolders. */
export function checkIndexConsistency(wiki: string): Finding[] {
  const findings: Finding[] = [];
  const index = buildLinkIndex(wiki);
  const indexFiles = listMarkdownRecursive(wiki).filter(
    (p) => basename(p) === "_index.md" || isFolderNote(p),
  );

  for (const indexFile of indexFiles) {
    const folder = dirname(indexFile);
    const folderName = basename(folder);
    const indexName = basename(indexFile);
    const indexRel = toRel(wiki, indexFile);
    const content = readFileSafe(indexFile) ?? "";
    const fm = parseFrontmatter(content);

    // `children` are `"[[wikilink]]"` values (piped-basename or path-qualified).
    // Resolve each to the wiki-relative page it points at — comparing by resolved
    // file, not by title (ADR-0031): a `[[cli-ts|cli.ts]]` child must match the
    // page whose basename is `cli-ts`, whatever its `title:`.
    const childTargets = stringList(fm["children"]).map(stripWikilink);
    const childResolved = new Map<string, string | null>();
    for (const child of childTargets) {
      const r = resolveLink(child, indexRel, index);
      childResolved.set(child, r === null ? null : r.file);
    }
    const childResolvedFiles = new Set(
      [...childResolved.values()].filter((f): f is string => f !== null),
    );

    // Actual pages in this folder, each as { title, rel } for messaging + matching.
    const actualPages = listMarkdownShallow(folder)
      .filter((p) => basename(p) !== "_index.md" && !isFolderNote(p))
      .map((p) => ({ title: titleAtPath(p), rel: toRel(wiki, p) }));
    const actualSubdirs = listSubdirs(folder).map((d) => basename(d));

    // Pages present in the folder but missing from the index children list.
    for (const page of actualPages) {
      if (childTargets.length > 0) {
        if (!childResolvedFiles.has(page.rel)) {
          findings.push({
            severity: "warn",
            check: "moc",
            message: `Page "${page.title}" in ${folderName}/ but not in ${folderName}/${indexName} children`,
            file: indexFile,
          });
        }
      } else {
        findings.push({
          severity: "warn",
          check: "moc",
          message: `Page "${page.title}" in ${folderName}/ but ${indexName} has empty children list`,
          file: indexFile,
        });
      }
    }

    // Children listed in the index that resolve to no page anywhere in wiki/.
    // A child link is an error only when it is genuinely dangling (resolves to
    // nothing). A child that resolves to a real page — even one outside this
    // folder, e.g. a path-qualified target — is a valid edge, not a defect.
    for (const child of childTargets) {
      const resolved = childResolved.get(child) ?? null;
      if (resolved === null) {
        findings.push({
          severity: "error",
          check: "moc",
          message: `Index lists "${child}" but no matching page found in ${folderName}/`,
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

  // Build the resolution index once, then collect the set of wiki-relative
  // files every citing wikilink resolves to (path ∪ basename — ADR-0031).
  // A source is referenced iff some page links to it by path-qualified or
  // piped-basename form, not just by the bare `[[title]]` string the old
  // substring scan looked for.
  const index = buildLinkIndex(wiki);
  const referenced = new Set<string>();
  for (const page of citingPages) {
    const content = readFileSafe(page) ?? "";
    const sourceRel = toRel(wiki, page);
    for (const raw of extractRawWikilinkTargets(content)) {
      const resolved = resolveLink(raw, sourceRel, index);
      if (resolved !== null) referenced.add(resolved.file);
    }
  }

  const findings: Finding[] = [];
  // The source manifest (`type: manifest`) is bookkeeping, not a source summary;
  // the schema exempts it from index-membership checks, so it is not an orphan.
  const sources = listMarkdownShallow(sourcesDir).filter((p) => {
    if (basename(p) === ".gitkeep") return false;
    const fm = parseFrontmatter(readFileSafe(p) ?? "");
    return fm.type !== "manifest";
  });
  for (const sourceFile of sources) {
    const sourceRel = toRel(wiki, sourceFile);
    if (!referenced.has(sourceRel)) {
      const title = titleAtPath(sourceFile);
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
    // Dot-directories (e.g. .claude/, .obsidian/) are tooling state, not topic
    // folders — they are not part of the wiki tree and carry no index file.
    if (name.startsWith(".")) continue;
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
