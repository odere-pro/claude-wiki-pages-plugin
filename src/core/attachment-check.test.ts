/**
 * Colocated tests for the attachment-check core module.
 *
 * Mirrors every branch of scripts/validate-attachments.sh: a non-text source
 * note must carry an attachment_path that resolves to an existing file under the
 * vault root, otherwise the write is blocked. text (or unset) source_format is
 * a pass-through, and only writes under <vault>/wiki/_sources/*.md are in scope.
 */

import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeVault } from "../test-helpers/sandbox/vault";
import { checkAttachment, type AttachmentInput } from "./attachment-check";

/** A source-note path inside the sandbox vault's wiki/_sources/ dir. */
function sourcePath(vault: string, name = "img-note.md"): string {
  return join(vault, "wiki", "_sources", name);
}

/** Build a frontmatter-only note body. */
function note(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  return ["---", ...lines, "---", "", "body"].join("\n");
}

describe("Feature: Verify › attachment provenance — scope", () => {
  test("ignores files outside wiki/_sources/", () => {
    const { vault, cleanup } = makeVault({});
    const input: AttachmentInput = {
      filePath: join(vault, "wiki", "topics", "page.md"),
      vaultRoot: vault,
      content: note({ source_format: "image", attachment_path: "raw/assets/x.png" }),
    };
    expect(checkAttachment(input)).toEqual([]);
    cleanup();
  });

  test("ignores non-markdown files under _sources/", () => {
    const { vault, cleanup } = makeVault({});
    const input: AttachmentInput = {
      filePath: join(vault, "wiki", "_sources", "x.png"),
      vaultRoot: vault,
      content: note({ source_format: "image" }),
    };
    expect(checkAttachment(input)).toEqual([]);
    cleanup();
  });
});

describe("Feature: Verify › attachment provenance — allowed cases", () => {
  test("allows a text source_format note (no attachment required)", () => {
    const { vault, cleanup } = makeVault({});
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: note({ source_format: "text" }),
    };
    expect(checkAttachment(input)).toEqual([]);
    cleanup();
  });

  test("allows a note with no source_format (defaults to text)", () => {
    const { vault, cleanup } = makeVault({});
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: note({ title: "Plain" }),
    };
    expect(checkAttachment(input)).toEqual([]);
    cleanup();
  });

  test("allows a note with no frontmatter at all", () => {
    const { vault, cleanup } = makeVault({});
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: "# Just a heading\nno frontmatter\n",
    };
    expect(checkAttachment(input)).toEqual([]);
    cleanup();
  });

  test("allows empty content (e.g. a no-op edit)", () => {
    const { vault, cleanup } = makeVault({});
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: "",
    };
    expect(checkAttachment(input)).toEqual([]);
    cleanup();
  });

  test("allows a non-text note whose attachment_path exists on disk", () => {
    const { vault, root, cleanup } = makeVault({
      "raw/assets/diagram.png": "PNGDATA",
    });
    writeFileSync(join(vault, "raw", "assets", "diagram.png"), "PNGDATA");
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: note({ source_format: "image", attachment_path: "raw/assets/diagram.png" }),
    };
    expect(checkAttachment(input)).toEqual([]);
    void root;
    cleanup();
  });

  test("strips quotes around attachment_path before resolving", () => {
    const { vault, cleanup } = makeVault({
      "raw/assets/scan.pdf": "PDF",
    });
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: note({ source_format: "pdf", attachment_path: '"raw/assets/scan.pdf"' }),
    };
    expect(checkAttachment(input)).toEqual([]);
    cleanup();
  });
});

describe("Feature: Verify › attachment provenance — blocked cases", () => {
  test("blocks a non-text note missing attachment_path", () => {
    const { vault, cleanup } = makeVault({});
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: note({ source_format: "image" }),
    };
    const findings = checkAttachment(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.check).toBe("attachments");
    expect(findings[0]?.message).toContain("no attachment_path");
    expect(findings[0]?.message).toContain("image");
    cleanup();
  });

  test("blocks a non-text note whose attachment_path is dangling", () => {
    const { vault, cleanup } = makeVault({});
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: note({ source_format: "image", attachment_path: "raw/assets/missing.png" }),
    };
    const findings = checkAttachment(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.check).toBe("attachments");
    expect(findings[0]?.message).toContain("does not exist");
    expect(findings[0]?.message).toContain("raw/assets/missing.png");
    cleanup();
  });

  test("blocks an empty attachment_path on a non-text note", () => {
    const { vault, cleanup } = makeVault({});
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: note({ source_format: "audio", attachment_path: '""' }),
    };
    const findings = checkAttachment(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("no attachment_path");
    cleanup();
  });
});

describe("Feature: Verify › attachment provenance — injected existence predicate", () => {
  test("uses a custom exists() to decide (no disk touch)", () => {
    const { vault, cleanup } = makeVault({});
    const seen: string[] = [];
    const input: AttachmentInput = {
      filePath: sourcePath(vault),
      vaultRoot: vault,
      content: note({ source_format: "image", attachment_path: "raw/assets/x.png" }),
      exists: (p: string) => {
        seen.push(p);
        return true;
      },
    };
    expect(checkAttachment(input)).toEqual([]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(join(vault, "raw/assets/x.png"));
    cleanup();
  });
});
