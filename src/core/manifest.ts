/**
 * Source manifest (schema v2) — a deterministic processed-state table for raw
 * sources, written to `wiki/_sources/manifest.md`.
 *
 * It gives ingest an idempotency key (a re-dropped file is detected by checksum)
 * and lets the autonomous maintenance loop detect backlog without re-scanning
 * the log. A raw file is `processed` when a source summary with the same stem
 * exists under `wiki/_sources/`, otherwise `pending`. Output is sorted so two
 * runs over the same inputs produce byte-identical content.
 */

import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { listMarkdownShallow, readFileSafe, existsSync } from "./fs.ts";
import { titleOf } from "./frontmatter.ts";

export const MANIFEST_RELATIVE = "wiki/_sources/manifest.md";

export interface ManifestRow {
  readonly rawFile: string; // vault-relative path
  readonly status: "processed" | "pending" | "skipped";
  readonly sourcePage: string; // [[wikilink]] or "—"
  readonly checksum: string;
  readonly ingestedAt: string;
}

/** Short content hash used as the idempotency key for a raw source. */
function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

/** Recursively list files under `raw/`, skipping `assets/`, dotfiles, and `.gitkeep`. */
export function listRawFiles(rawDir: string): string[] {
  if (!existsSync(rawDir)) return [];
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (name === "assets") continue;
        walk(full);
      } else if (st.isFile()) {
        out.push(full);
      }
    }
  };
  walk(rawDir);
  return out.sort();
}

/** Map of source-summary filename stems → page title, for raw→source matching. */
function sourcePageIndex(sourcesDir: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of listMarkdownShallow(sourcesDir)) {
    const stem = basename(p, ".md");
    if (stem === "manifest" || stem === "_index") continue;
    map.set(stem, titleOf(readFileSafe(p) ?? "", p));
  }
  return map;
}

/** Compute the manifest rows for a vault (deterministic, sorted by raw path). */
export function manifestRows(vault: string, today: string): ManifestRow[] {
  const sources = sourcePageIndex(join(vault, "wiki", "_sources"));
  return listRawFiles(join(vault, "raw")).map((full) => {
    const rawFile = relative(vault, full);
    const stem = basename(full, extname(full));
    const title = sources.get(stem);
    return {
      rawFile,
      status: title ? "processed" : "pending",
      sourcePage: title ? `[[${title}]]` : "—",
      checksum: checksum(readFileSafe(full) ?? ""),
      ingestedAt: title ? today : "—",
    } as const;
  });
}

/** Render the full manifest page (frontmatter + table). */
export function buildManifest(vault: string, today: string): string {
  const rows = manifestRows(vault, today);
  const header = [
    "---",
    'title: "Source Manifest"',
    "type: manifest",
    `created: ${today}`,
    `updated: ${today}`,
    "---",
    "",
    "# Source Manifest",
    "",
    "Processed-state of every raw source. Maintained by the engine (`migrate`, `ingest`); avoid editing by hand.",
    "",
    "| raw_file | status | source_page | checksum | ingested_at |",
    "| --- | --- | --- | --- | --- |",
  ];
  const body = rows.map(
    (r) => `| ${r.rawFile} | ${r.status} | ${r.sourcePage} | ${r.checksum} | ${r.ingestedAt} |`,
  );
  return [...header, ...body, ""].join("\n");
}
