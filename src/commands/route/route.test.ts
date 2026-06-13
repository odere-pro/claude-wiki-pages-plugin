import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decideRoute, route, decideParallelExtract } from "./route.ts";
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

// ─── P1-A6: degrade ladder — parallelExtract observable decision ─────────────

describe("decideParallelExtract (P1-A6 — pure function)", () => {
  test("unset (undefined) → effective=1 reason=default-sequential", () => {
    const r = decideParallelExtract(undefined, "claude");
    expect(r.requested).toBe(1);
    expect(r.effective).toBe(1);
    expect(r.reason).toBe("default-sequential");
  });

  test("requested=1 (explicit default) → effective=1 reason=default-sequential", () => {
    const r = decideParallelExtract(1, "claude");
    expect(r.requested).toBe(1);
    expect(r.effective).toBe(1);
    expect(r.reason).toBe("default-sequential");
  });

  test("requested=4, route=claude → effective=4 reason=claude", () => {
    const r = decideParallelExtract(4, "claude");
    expect(r.requested).toBe(4);
    expect(r.effective).toBe(4);
    expect(r.reason).toBe("claude");
  });

  test("requested=4, route=local → effective=1 reason names local cause", () => {
    const r = decideParallelExtract(4, "local");
    expect(r.requested).toBe(4);
    expect(r.effective).toBe(1);
    expect(r.reason).toContain("local");
  });

  test("requested=4, route=blocked → effective=1 reason names blocked cause", () => {
    const r = decideParallelExtract(4, "blocked");
    expect(r.requested).toBe(4);
    expect(r.effective).toBe(1);
    expect(r.reason).toContain("blocked");
  });

  test("every effective==1 case: unset/default", () => {
    expect(decideParallelExtract(undefined, "claude").effective).toBe(1);
  });

  test("every effective==1 case: local decision", () => {
    expect(decideParallelExtract(8, "local").effective).toBe(1);
  });

  test("every effective==1 case: blocked decision", () => {
    expect(decideParallelExtract(8, "blocked").effective).toBe(1);
  });
});

describe("route — parallelExtract field on RouteReport (P1-A6)", () => {
  const withMaintenanceConfig = (
    maxParallelExtract: number | undefined,
    localModel: Record<string, unknown>,
    opts: { ollama?: string; claude?: string } = {},
  ) => {
    const root = mkdtempSync(join(tmpdir(), "cwp-route-pe-"));
    mkdirSync(join(root, ".claude"), { recursive: true });
    const cfg: Record<string, unknown> = { localModel };
    if (maxParallelExtract !== undefined) {
      cfg["maintenance"] = { maxParallelExtract };
    }
    writeFileSync(join(root, ".claude/claude-wiki-pages.json"), JSON.stringify(cfg));
    const report = route({ cwd: root, ...opts });
    rmSync(root, { recursive: true, force: true });
    return report;
  };

  test("route=claude, maxParallelExtract unset → effective=1, reason=default-sequential", () => {
    const root = mkdtempSync(join(tmpdir(), "cwp-route-pe-"));
    const report = route({ cwd: root });
    rmSync(root, { recursive: true, force: true });
    expect(report.parallelExtract.requested).toBe(1);
    expect(report.parallelExtract.effective).toBe(1);
    expect(report.parallelExtract.reason).toBe("default-sequential");
  });

  test("route=claude, maxParallelExtract=4 → effective=4, reason=claude", () => {
    const report = withMaintenanceConfig(4, {}, {});
    expect(report.parallelExtract.requested).toBe(4);
    expect(report.parallelExtract.effective).toBe(4);
    expect(report.parallelExtract.reason).toBe("claude");
  });

  test("route=local, maxParallelExtract=4 → effective=1, reason contains local", () => {
    const report = withMaintenanceConfig(
      4,
      {
        enabled: true,
        model: "qwen3-coder:30b",
        tier: "ingest-extract",
        offlinePolicy: "prefer-local",
      },
      { claude: "unreachable", ollama: "up" },
    );
    expect(report.decision).toBe("local");
    expect(report.parallelExtract.requested).toBe(4);
    expect(report.parallelExtract.effective).toBe(1);
    expect(report.parallelExtract.reason).toContain("local");
  });

  test("route=blocked, maxParallelExtract=4 → effective=1, reason contains blocked", () => {
    const report = withMaintenanceConfig(
      4,
      {
        enabled: true,
        model: "qwen3-coder:30b",
        tier: "ingest-extract",
        offlinePolicy: "strict",
      },
      { claude: "unreachable" },
    );
    expect(report.decision).toBe("blocked");
    expect(report.parallelExtract.requested).toBe(4);
    expect(report.parallelExtract.effective).toBe(1);
    expect(report.parallelExtract.reason).toContain("blocked");
  });
});
