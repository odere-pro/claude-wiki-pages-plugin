/**
 * Attachment validation for non-text source notes — the pure decision core for
 * scripts/validate-attachments.sh (the PreToolUse `Write|Edit` gate that blocks
 * a `wiki/_sources/*.md` note whose `attachment_path` is missing or dangling).
 *
 * The bash hook decides on the POST-operation content of a source note: when
 * `source_format` is anything other than `text` (or unset), the note must carry
 * an `attachment_path` that resolves — relative to the vault root — to a file
 * that exists on disk. Otherwise the write is blocked.
 *
 * This module is pure: it takes the already-resolved post-operation content plus
 * the resolved paths, and returns `Finding[]` (empty = allow). The hook-stdin
 * decoding, Edit old/new reconstruction, and vault resolution stay in the
 * caller (the firewall-adjacent engine entry / the bash wrapper); keeping them
 * out of here makes every branch testable without a hook payload. Untrusted
 * fields are read through `unknown` + narrowing — never `any`.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter";
import type { Finding } from "./report";

/** The check name attached to every Finding this module emits. */
const CHECK = "attachments";

/** A source note is in scope only when it lives under `wiki/_sources/` and ends in `.md`. */
const IN_SCOPE = /\/wiki\/_sources\/[^/]*\.md$/;

export interface AttachmentInput {
  /** Absolute path of the source note being written/edited. */
  readonly filePath: string;
  /** Absolute path of the vault root (the parent of `wiki/`); attachments resolve against it. */
  readonly vaultRoot: string;
  /** The note content AFTER the write/edit would be applied (frontmatter + body). */
  readonly content: string;
  /**
   * Existence predicate for the resolved attachment path. Defaults to a real
   * `fs.existsSync`; injectable so tests can decide without touching disk.
   */
  readonly exists?: (absPath: string) => boolean;
}

/** Read a frontmatter field as a trimmed, quote-stripped scalar string (empty when absent). */
function scalar(fields: Record<string, unknown>, key: string): string {
  const raw = fields[key];
  if (typeof raw !== "string") return "";
  // Mirror the bash `tr -d '"'\''' | xargs`: drop surrounding quotes and trim.
  return raw.replace(/^['"]+|['"]+$/g, "").trim();
}

/**
 * Validate the attachment contract for one source-note write. Returns an empty
 * array when the write is allowed, or a single error `Finding` describing why it
 * must be blocked (no `attachment_path`, or a dangling one).
 */
export function checkAttachment(input: AttachmentInput): Finding[] {
  const { filePath, vaultRoot, content } = input;
  const exists = input.exists ?? existsSync;

  // Only validate in-scope source notes; everything else is a pass-through.
  if (!IN_SCOPE.test(filePath)) return [];
  if (content.trim() === "") return [];

  const fields = parseFrontmatter(content);
  const sourceFormat = scalar(fields, "source_format");

  // Default is text — nothing to enforce.
  if (sourceFormat === "" || sourceFormat === "text") return [];

  const attachmentPath = scalar(fields, "attachment_path");
  if (attachmentPath === "") {
    return [
      {
        severity: "error",
        check: CHECK,
        file: filePath,
        message:
          `source note has source_format: ${sourceFormat} but no attachment_path. ` +
          `Add attachment_path pointing to the file under raw/assets/.`,
      },
    ];
  }

  const absAttachment = join(vaultRoot, attachmentPath);
  if (!exists(absAttachment)) {
    return [
      {
        severity: "error",
        check: CHECK,
        file: filePath,
        message:
          `attachment_path '${attachmentPath}' does not exist at ${absAttachment}. ` +
          `Add the file to raw/assets/ before writing the source note.`,
      },
    ];
  }

  return [];
}
