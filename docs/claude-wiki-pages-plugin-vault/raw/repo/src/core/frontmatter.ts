/**
 * Frontmatter parsing for wiki pages.
 *
 * A tiny splitter isolates the leading `--- … ---` YAML block; the block itself
 * is parsed with the battle-tested `yaml` library rather than the awk/sed
 * heuristics in scripts/verify-ingest.sh. On the well-formed vault fixtures the
 * two agree, which is what the parity gate asserts.
 */

import { basename } from "node:path";
import { parse as parseYaml } from "yaml";

export interface SplitDoc {
  /** Raw YAML block text (without the `---` fences), or null when absent. */
  readonly frontmatter: string | null;
  /** Everything after the closing fence (or the whole file when no frontmatter). */
  readonly body: string;
}

/** Split a markdown document into its leading frontmatter block and body. */
export function splitFrontmatter(content: string): SplitDoc {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return { frontmatter: null, body: content };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      return {
        frontmatter: lines.slice(1, i).join("\n"),
        body: lines.slice(i + 1).join("\n"),
      };
    }
  }
  // Unterminated frontmatter — treat the whole file as body, like the bash `sed` fallback.
  return { frontmatter: null, body: content };
}

/** Parse the frontmatter block into an object. Returns {} when absent or invalid. */
export function parseFrontmatter(content: string): Record<string, unknown> {
  const { frontmatter } = splitFrontmatter(content);
  if (frontmatter === null) return {};
  try {
    const parsed = parseYaml(frontmatter) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The `title:` value, falling back to the filename stem (mirrors the bash default). */
export function titleOf(content: string, filePath: string): string {
  const fm = parseFrontmatter(content);
  const t = fm["title"];
  if (typeof t === "string" && t.trim() !== "") return t.trim();
  return basename(filePath, ".md");
}

/** Coerce a frontmatter field into a list of strings (inline or block YAML array). */
export function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  return [];
}

/** Strip a surrounding `[[ … ]]` wikilink wrapper, leaving the inner target. */
export function stripWikilink(s: string): string {
  return s.replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
}
