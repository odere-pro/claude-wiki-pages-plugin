/**
 * Deterministic builders for the safe subset of MOC repairs `fix` applies.
 *
 * All operations are idempotent: running them on an already-correct file
 * produces byte-identical output. Body prose (the human/LLM-authored `## Pages`
 * descriptions, synthesis, etc.) is never touched — only the structural
 * frontmatter list and duplicate index bullets, which have one correct value.
 */

import { splitFrontmatter } from "./frontmatter.ts";
import { extractWikilinks } from "./wikilinks.ts";

/**
 * Replace a YAML list field (inline `field: [...]` or block `field:\n  - …`)
 * in a frontmatter block with `items`, preserving every other line.
 */
export function replaceYamlListField(
  frontmatter: string,
  field: string,
  items: readonly string[],
): string {
  const lines = frontmatter.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^${field}:`).test(l));
  if (start === -1) return frontmatter;

  // Determine the span of the existing field (inline = 1 line; block = key + list items).
  let end = start;
  const isInline = /^[^:]+:\s*\[/.test(lines[start] ?? "");
  if (!isInline) {
    let j = start + 1;
    while (j < lines.length && /^\s*-\s/.test(lines[j] ?? "")) j++;
    end = j - 1;
  }

  const replacement =
    items.length === 0 ? [`${field}: []`] : [`${field}:`, ...items.map((t) => `  - "${t}"`)];
  return [...lines.slice(0, start), ...replacement, ...lines.slice(end + 1)].join("\n");
}

/** Set the `children:` frontmatter list of an `_index.md` to `titles` (as `[[Title]]`). */
export function syncChildren(content: string, titles: readonly string[]): string {
  const { frontmatter, body } = splitFrontmatter(content);
  if (frontmatter === null) return content;
  const wikilinked = titles.map((t) => `[[${t}]]`);
  const next = replaceYamlListField(frontmatter, "children", wikilinked);
  if (next === frontmatter) return content;
  return `---\n${next}\n---\n${body}`;
}

/** Remove duplicate `[[Target]]` bullet lines from an index body, keeping the first of each. */
export function dedupeIndexLinks(content: string): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const line of body.split("\n")) {
    const targets = extractWikilinks(line);
    // Only dedupe lines whose payload is a single wikilink bullet.
    if (targets.length === 1 && /^\s*[-*]\s*\[\[/.test(line)) {
      const t = targets[0] ?? "";
      if (seen.has(t)) continue;
      seen.add(t);
    }
    kept.push(line);
  }
  const newBody = kept.join("\n");
  if (newBody === body) return content;
  return frontmatter === null ? newBody : `---\n${frontmatter}\n---\n${newBody}`;
}

/** Build a minimal, schema-shaped `_index.md` for a topic folder lacking one. */
export function buildIndexStub(
  folderName: string,
  childTitles: readonly string[],
  today: string,
): string {
  const titleCase = folderName
    .split(/[-_]/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
  const indexTitle = `${titleCase} — Index`;
  const children =
    childTitles.length === 0
      ? "children: []"
      : ["children:", ...childTitles.map((t) => `  - "[[${t}]]"`)].join("\n");
  const pages =
    childTitles.length === 0 ? "_No pages yet._" : childTitles.map((t) => `- [[${t}]]`).join("\n");

  return [
    "---",
    `title: "${indexTitle}"`,
    "type: index",
    `aliases: ["${indexTitle}", "${folderName}"]`,
    `parent: "[[Wiki Index]]"`,
    `path: "${folderName}"`,
    children,
    "child_indexes: []",
    `tags: ["${folderName}"]`,
    `created: ${today}`,
    `updated: ${today}`,
    "---",
    "",
    `# ${indexTitle}`,
    "",
    "## Pages",
    "",
    pages,
    "",
  ].join("\n");
}
