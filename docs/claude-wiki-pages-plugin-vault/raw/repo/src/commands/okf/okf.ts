/**
 * `okf` — OKF (Open Knowledge Format) interop: export + import.
 *
 * Unit 3 — `okf export <vault> <out>`:
 *   Renders `wiki/` as a portable OKF bundle. Wikilinks are rewritten as
 *   relative markdown links; frontmatter is stripped. A flat machine `index.md`
 *   catalog is also written (path/type/title/description/links). Writes land in
 *   `vault/output/` — the git-ignored scratch space — so `firewall.sh` and
 *   `protect-raw.sh` are satisfied unchanged.
 *
 * Unit 4 — `okf import <bundle> --target <vault> [--write]`:
 *   Reads the bundle's `index.md`, enumerates its markdown files, and for each
 *   computes a versioned snapshot name using the same `<stem>--<date>-<sha8>`
 *   dedup logic as `scripts/sync-source.sh`. `--write` gates the actual copy
 *   (dry-run by default, like `migrate`). Destination: `vault/raw/okf/<name>/`.
 *   New files only — never overwrite (raw is immutable). Maps OKF frontmatter
 *   → source schema.
 *
 * SINGLE MECHANISM (TEAM-BRIEF §6): OKF import writes only to `raw/`, never
 * to `wiki/` directly. The normal ingest pipeline handles `raw/` → `wiki/`.
 */

import { join, relative, basename, dirname } from "node:path";
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { listMarkdownRecursive, readFileSafe, existsSync, BOOKKEEPING } from "../../core/fs.ts";
import { parseFrontmatter, titleOf, stringList, splitFrontmatter } from "../../core/frontmatter.ts";
import { extractWikilinks } from "../../core/wikilinks.ts";
import { resolveVault } from "../../core/vault.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OkfResult {
  readonly command: "okf";
  readonly sub: string;
  readonly ok: boolean;
  readonly message: string;
  /** Files written or would-be-written (export) / imported (import). */
  readonly files: readonly string[];
  /** Import: files skipped (dedup or already-exists). */
  readonly skipped: readonly string[];
}

/** Injectable clock — returns the current Date. Defaults to `() => new Date()`. */
export type ClockFn = () => Date;

export interface OkfOptions {
  readonly sub: string | undefined;
  readonly target?: string;
  readonly cwd?: string;
  /**
   * export: output directory (absolute path). Defaults to `vault/output/okf/`.
   * import: path to the OKF bundle directory to import from.
   */
  readonly bundlePath?: string;
  /** import: dry-run by default; `--write` commits the copy. */
  readonly write?: boolean;
  /**
   * Injectable clock for deterministic date stamps in export index and import
   * source frontmatter / versioned filenames. Defaults to `() => new Date()`.
   */
  readonly clock?: ClockFn;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Compute an 8-character hex SHA-256 digest of the file content.
 * Mirrors `sync-source.sh file_sha12()` but uses 8 chars (sha8) for the
 * versioned sibling name.
 */
function sha8(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex").slice(0, 8);
}

/**
 * Rewrite `[[wikilink]]` and `[[Target|Display]]` references as relative
 * markdown links: `[[Title]]` → `[Title](title-slug.md)`. Mirrors the
 * `--links` mode in `scripts/distribute-wiki.sh transform()`.
 */
function rewriteWikilinks(body: string): string {
  return body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, display) => {
    const label: string = (display ?? target ?? "").trim();
    const slug = (target as string)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `[${label}](${slug}.md)`;
  });
}

/**
 * Strip the leading YAML frontmatter block.
 * Mirrors `scripts/distribute-wiki.sh strip_frontmatter()`.
 */
function stripFrontmatter(content: string): string {
  const { body } = splitFrontmatter(content);
  return body;
}

// ── Unit 3: OKF export ────────────────────────────────────────────────────────

/** One entry in the flat machine index.md catalog. */
interface CatalogEntry {
  readonly path: string;
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly links: readonly string[];
}

/**
 * Build the portable markdown body for one wiki page:
 * frontmatter stripped, wikilinks rewritten as relative links.
 */
function buildExportBody(content: string): string {
  const stripped = stripFrontmatter(content);
  return rewriteWikilinks(stripped);
}

/**
 * Export the vault's `wiki/` tree as a portable OKF bundle under
 * `vault/output/okf/`. Returns the list of written paths.
 */
function exportOkf(vault: string, clock: ClockFn): OkfResult {
  const wikiDir = join(vault, "wiki");
  if (!existsSync(wikiDir)) {
    return {
      command: "okf",
      sub: "export",
      ok: false,
      message: `okf export: wiki directory not found at ${wikiDir}`,
      files: [],
      skipped: [],
    };
  }

  const outDir = join(vault, "output", "okf");
  mkdirSync(outDir, { recursive: true });

  const catalog: CatalogEntry[] = [];
  const written: string[] = [];

  for (const file of listMarkdownRecursive(wikiDir)) {
    const stem = basename(file, ".md");
    if (BOOKKEEPING.has(stem)) continue;

    const content = readFileSafe(file);
    if (content === null) continue;

    const fm = parseFrontmatter(content);
    const title = titleOf(content, file);
    const type = typeof fm["type"] === "string" ? (fm["type"] as string) : "";
    const description = typeof fm["description"] === "string" ? (fm["description"] as string) : "";
    const tags = stringList(fm["tags"]);

    // Compute the relative path from wiki/ for the output file.
    const relFromWiki = relative(wikiDir, file);
    const outFile = join(outDir, relFromWiki);

    mkdirSync(dirname(outFile), { recursive: true });

    // Build the OKF frontmatter: map vault fields to OKF fields.
    const okfFm: string[] = ["---"];
    okfFm.push(`title: ${JSON.stringify(title)}`);
    if (type) okfFm.push(`type: ${JSON.stringify(type)}`);
    if (description) okfFm.push(`description: ${JSON.stringify(description)}`);
    if (tags.length > 0) okfFm.push(`tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]`);
    // Map sources to OKF resource
    const sources = stringList(fm["sources"]);
    if (sources.length > 0) {
      okfFm.push(`resource: ${JSON.stringify(sources[0] ?? "")}`);
    }
    // Map url if present
    const url = typeof fm["url"] === "string" ? (fm["url"] as string) : "";
    if (url) okfFm.push(`url: ${JSON.stringify(url)}`);
    okfFm.push("---");

    const exportedBody = buildExportBody(content);
    const outputContent = okfFm.join("\n") + "\n" + exportedBody;

    writeFileSync(outFile, outputContent, "utf8");
    const relOut = relative(vault, outFile);
    written.push(relOut);

    // Collect wikilinks from the original content for the catalog.
    const { body } = splitFrontmatter(content);
    const links = extractWikilinks(body);

    catalog.push({
      path: relFromWiki,
      type,
      title,
      description,
      links: Object.freeze(links),
    });
  }

  // Write the flat machine index.md catalog.
  const indexLines: string[] = [
    "---",
    `title: "OKF Bundle Index"`,
    `generated: ${clock().toISOString().slice(0, 10)}`,
    "---",
    "",
    "# OKF Bundle Index",
    "",
    "| path | type | title | description | links |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const e of catalog) {
    const linkList = e.links.length > 0 ? e.links.slice(0, 5).join(", ") : "";
    indexLines.push(
      `| ${e.path} | ${e.type} | ${e.title} | ${e.description.slice(0, 80)} | ${linkList} |`,
    );
  }
  indexLines.push("");

  const indexPath = join(outDir, "index.md");
  writeFileSync(indexPath, indexLines.join("\n"), "utf8");
  written.push(relative(vault, indexPath));

  return {
    command: "okf",
    sub: "export",
    ok: true,
    message: `okf export: ${written.length - 1} page(s) + index.md written to ${relative(vault, outDir)}/`,
    files: Object.freeze(written),
    skipped: Object.freeze([]),
  };
}

// ── Unit 4: OKF import ────────────────────────────────────────────────────────

/**
 * Parse the OKF bundle's `index.md` to enumerate which paths exist in the
 * bundle. Returns an array of relative-from-bundle paths.
 */
function parseBundleIndex(bundleDir: string): readonly string[] {
  const indexPath = join(bundleDir, "index.md");
  const content = readFileSafe(indexPath);
  if (content === null) return [];

  const paths: string[] = [];
  const { body } = splitFrontmatter(content);
  for (const line of body.split("\n")) {
    // Table rows: | path | type | … | — skip header and separator.
    if (!line.startsWith("|")) continue;
    if (line.includes("path") && line.includes("type")) continue;
    if (/^\|[\s|:-]+\|?\s*$/.test(line.trim())) continue;
    const cells = line
      .trim()
      .split("|")
      .slice(1)
      .map((c) => c.trim());
    const pathCell = cells[0];
    if (pathCell && pathCell.length > 0 && pathCell !== "path") {
      paths.push(pathCell);
    }
  }
  return Object.freeze(paths);
}

/**
 * Map OKF frontmatter fields to the vault's source schema.
 * OKF: type, title, description, tags, resource (→url), url
 * Vault source schema: type → source_type, resource → url, title, description, tags,
 *   plus stamp date_ingested, source_type, status.
 */
function buildSourceFrontmatter(
  fm: Record<string, unknown>,
  bundleName: string,
  clock: ClockFn,
): string {
  const title = typeof fm["title"] === "string" ? fm["title"] : "";
  const description = typeof fm["description"] === "string" ? fm["description"] : "";
  const tags = stringList(fm["tags"]);
  const resource = typeof fm["resource"] === "string" ? fm["resource"] : "";
  const url = typeof fm["url"] === "string" ? fm["url"] : resource;
  const today = clock().toISOString().slice(0, 10);

  const lines: string[] = ["---"];
  if (title) lines.push(`title: ${JSON.stringify(title)}`);
  lines.push(`type: source`);
  lines.push(`source_type: okf`);
  lines.push(`status: active`);
  lines.push(`date_ingested: ${today}`);
  lines.push(`bundle: ${JSON.stringify(bundleName)}`);
  if (url) lines.push(`url: ${JSON.stringify(url)}`);
  if (description) lines.push(`description: ${JSON.stringify(description)}`);
  if (tags.length > 0) lines.push(`tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]`);
  lines.push("---");
  return lines.join("\n");
}

/**
 * Import an OKF bundle's markdown files as raw snapshots in `vault/raw/okf/<name>/`.
 * Dedup logic mirrors `scripts/sync-source.sh`:
 *   - First snapshot: `<stem>.md` (no version suffix).
 *   - Changed content: `<stem>--<date>-<sha8>.md` (versioned sibling).
 *   - Exact content already exists in any snapshot: skip.
 *   - Never overwrite existing files.
 */
function importOkf(vault: string, bundlePath: string, doWrite: boolean, clock: ClockFn): OkfResult {
  if (!existsSync(bundlePath)) {
    return {
      command: "okf",
      sub: "import",
      ok: false,
      message: `okf import: bundle path not found: ${bundlePath}`,
      files: [],
      skipped: [],
    };
  }

  const bundleName = basename(bundlePath);
  const destRoot = join(vault, "raw", "okf", bundleName);
  const today = clock().toISOString().slice(0, 10);

  // Parse the bundle index to discover which paths exist.
  const indexedPaths = parseBundleIndex(bundlePath);
  // Also fall back to listing all .md files in the bundle (excluding index.md).
  const allBundleFiles = listMarkdownRecursive(bundlePath).filter(
    (f) => basename(f) !== "index.md",
  );

  // Determine which files to process: union of indexed + discovered.
  const toProcess: string[] = [];
  const indexedSet = new Set(indexedPaths.map((p) => join(bundlePath, p)));
  for (const f of allBundleFiles) {
    if (!indexedSet.has(f)) toProcess.push(f);
  }
  for (const p of indexedPaths) {
    const abs = join(bundlePath, p);
    if (existsSync(abs) && !toProcess.includes(abs)) toProcess.push(abs);
  }

  const written: string[] = [];
  const skipped: string[] = [];

  for (const srcFile of toProcess.sort()) {
    const content = readFileSafe(srcFile);
    if (content === null) {
      skipped.push(relative(bundlePath, srcFile));
      continue;
    }

    const relFromBundle = relative(bundlePath, srcFile);
    const destFile = join(destRoot, relFromBundle);
    const destDir = dirname(destFile);
    const ext = ".md";
    const stem = basename(relFromBundle, ext);

    // Build the transformed import content first so we can deduplicate on it.
    const fm = parseFrontmatter(content);
    const { body } = splitFrontmatter(content);
    const sourceFm = buildSourceFrontmatter(fm, bundleName, clock);
    const importContent = sourceFm + "\n" + body;

    // sha8 of the TRANSFORMED content — used for dedup and versioned naming.
    const sha = sha8(importContent);

    // Dedup: check if this exact (transformed) content already exists in any snapshot.
    let isDup = false;
    if (existsSync(destDir)) {
      // Check original + all versioned siblings.
      try {
        const entries = readdirSync(destDir);
        for (const entry of entries) {
          if (!entry.endsWith(ext)) continue;
          if (entry !== basename(destFile) && !entry.startsWith(`${stem}--`)) continue;
          const existingContent = readFileSafe(join(destDir, entry));
          if (existingContent !== null && sha8(existingContent) === sha) {
            isDup = true;
            break;
          }
        }
      } catch {
        // destDir doesn't exist yet — not a dup.
      }
    }
    if (isDup) {
      skipped.push(relFromBundle);
      continue;
    }

    // Determine destination path: versioned sibling if original already exists.
    let finalDest = destFile;
    if (existsSync(destFile)) {
      finalDest = join(destDir, `${stem}--${today}-${sha}${ext}`);
      if (existsSync(finalDest)) {
        skipped.push(relFromBundle);
        continue;
      }
    }

    const relOut = relative(vault, finalDest);
    written.push(relOut);

    if (doWrite) {
      mkdirSync(destDir, { recursive: true });
      writeFileSync(finalDest, importContent, "utf8");
    }
  }

  const dryRunNote = doWrite ? "" : " (dry-run; use --write to apply)";
  return {
    command: "okf",
    sub: "import",
    ok: true,
    message: `okf import: ${written.length} file(s) would be written, ${skipped.length} skipped${dryRunNote}`,
    files: Object.freeze(written),
    skipped: Object.freeze(skipped),
  };
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export function okf(opts: OkfOptions): OkfResult {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const sub = opts.sub ?? "";
  const clock: ClockFn = opts.clock ?? (() => new Date());

  if (sub === "export") {
    return exportOkf(vault, clock);
  }

  if (sub === "import") {
    const bundlePath = opts.bundlePath ?? join(vault, "output", "okf");
    return importOkf(vault, bundlePath, opts.write === true, clock);
  }

  return {
    command: "okf",
    sub,
    ok: false,
    message: `okf: requires a subcommand — export | import`,
    files: [],
    skipped: [],
  };
}
