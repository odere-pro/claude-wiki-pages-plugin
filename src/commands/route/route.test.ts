import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decideRoute, route } from "./route.ts";
import { exitCode } from "../../core/report.ts";

describe("decideRoute (pure matrix, ADR-0018 §4)", () => {
  test("off → always Claude, even when unreachable", () => {
    expect(decideRoute("off", false, true, true).decision).toBe("claude");
    expect(decideRoute("off", true, false, false).decision).toBe("claude");
  });

  test("strict → Claude when reachable, blocked when unreachable", () => {
    expect(decideRoute("strict", true, true, true).decision).toBe("claude");
    expect(decideRoute("strict", false, true, true).decision).toBe("blocked");
  });

  test("prefer-local → Claude when reachable", () => {
    expect(decideRoute("prefer-local", true, true, true).decision).toBe("claude");
  });

  test("prefer-local + unreachable + approved tier + Ollama up → local", () => {
    const r = decideRoute("prefer-local", false, true, true);
    expect(r.decision).toBe("local");
  });

  test("prefer-local + unreachable + approved tier + Ollama down → blocked", () => {
    const r = decideRoute("prefer-local", false, true, false);
    expect(r.decision).toBe("blocked");
    expect(r.reason).toContain("Ollama");
  });

  test("prefer-local + unreachable + unapproved tier → blocked", () => {
    const r = decideRoute("prefer-local", false, false, true);
    expect(r.decision).toBe("blocked");
    expect(r.reason).toContain("gate-approved");
  });
});

describe("route (config-aware handler)", () => {
  const withConfig = (
    localModel: Record<string, unknown>,
    opts: { ollama?: string; claude?: string } = {},
  ) => {
    const root = mkdtempSync(join(tmpdir(), "cwp-route-"));
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(join(root, ".claude/claude-wiki-pages.json"), JSON.stringify({ localModel }));
    const report = route({ cwd: root, ...opts });
    rmSync(root, { recursive: true, force: true });
    return report;
  };

  test("default config (offlinePolicy off) → claude, exit 0", () => {
    const root = mkdtempSync(join(tmpdir(), "cwp-route-"));
    const report = route({ cwd: root, claude: "unreachable" });
    expect(report.decision).toBe("claude");
    expect(report.offlinePolicy).toBe("off");
    expect(exitCode(report)).toBe(0);
    rmSync(root, { recursive: true, force: true });
  });

  test("prefer-local + approved ingest-extract + Claude down + Ollama up → local, exit 0", () => {
    const report = withConfig(
      {
        enabled: true,
        model: "qwen3-coder:30b",
        tier: "ingest-extract",
        offlinePolicy: "prefer-local",
      },
      { claude: "unreachable", ollama: "up" },
    );
    expect(report.decision).toBe("local");
    expect(report.tier).toBe("ingest-extract");
    expect(exitCode(report)).toBe(0);
  });

  test("prefer-local + BLOCKED tier (draft) + Claude down → blocked, exit 1", () => {
    const report = withConfig(
      { enabled: true, model: "qwen3-coder:30b", tier: "draft", offlinePolicy: "prefer-local" },
      { claude: "unreachable", ollama: "up" },
    );
    expect(report.decision).toBe("blocked");
    expect(exitCode(report)).toBe(1);
  });

  test("strict + Claude unreachable → blocked, exit 1", () => {
    const report = withConfig(
      {
        enabled: true,
        model: "qwen3-coder:30b",
        tier: "ingest-extract",
        offlinePolicy: "strict",
      },
      { claude: "unreachable" },
    );
    expect(report.decision).toBe("blocked");
    expect(exitCode(report)).toBe(1);
  });
});
