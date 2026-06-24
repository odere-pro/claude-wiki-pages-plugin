import { test, expect, describe } from "bun:test";
import { execFileSync } from "node:child_process";
import { doctor, doctorExit, type DoctorRunner } from "./doctor.ts";
import { makeVault, CLEAN_VAULT } from "../../test-helpers/sandbox/vault.ts";

/** D11 stays deterministic in tests: never let it reach a real `obsidian`. */
const noCli: DoctorRunner = () => ({ ok: false, stdout: "" });

describe("doctor", () => {
  test("a healthy vault passes the vault-scoped checks", async () => {
    const sb = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" });
    execFileSync("git", ["init"], { cwd: sb.vault, stdio: "ignore" });

    const report = await doctor({ target: sb.vault, pluginRoot: sb.vault, runner: noCli });
    const byId = Object.fromEntries(report.results.map((c) => [c.id, c.status]));

    expect(byId["D01"]).toBe("pass"); // vault exists
    expect(byId["D02"]).toBe("pass"); // schema_version 1
    expect(byId["D05"]).toBe("pass"); // git repo
    expect(byId["D09"]).toBe("pass"); // verify clean
    expect(report.results).toHaveLength(12);
    sb.cleanup();
  });

  test("a missing vault fails D01 and --strict exits 3", async () => {
    const report = await doctor({ target: "/no/such/vault-xyz" });
    expect(report.results.find((c) => c.id === "D01")?.status).toBe("fail");
    expect(report.worst).toBe("fail");
    expect(doctorExit(report, true)).toBe(3);
    expect(doctorExit(report, false)).toBe(0);
  });

  test("D05 distinguishes a vault covered by a parent repo from its own repo", async () => {
    const sb = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" });
    execFileSync("git", ["init"], { cwd: sb.vault, stdio: "ignore" });
    const own = await doctor({ target: sb.vault, pluginRoot: sb.vault, runner: noCli });
    expect(own.results.find((c) => c.id === "D05")?.message).toContain("its own git repo");
    sb.cleanup();

    // Vault nested inside a project repo: D05 still passes, names the parent root.
    const sb2 = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" }, { nest: "docs/vault" });
    execFileSync("git", ["init"], { cwd: sb2.root, stdio: "ignore" });
    const inherited = await doctor({ target: sb2.vault, pluginRoot: sb2.vault, runner: noCli });
    const d05 = inherited.results.find((c) => c.id === "D05");
    expect(d05?.status).toBe("pass");
    expect(d05?.message).toContain("covered by the repo at");
    sb2.cleanup();
  });

  test("--fix initialises git (D05) on a non-repo vault", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const before = await doctor({ target: sb.vault, pluginRoot: sb.vault, runner: noCli });
    expect(before.results.find((c) => c.id === "D05")?.status).toBe("warn");

    const after = await doctor({
      target: sb.vault,
      pluginRoot: sb.vault,
      fix: true,
      runner: noCli,
    });
    expect(after.results.find((c) => c.id === "D05")?.status).toBe("fixed");
    sb.cleanup();
  });

  describe("D11 — Obsidian link parity (advisory)", () => {
    const d11 = async (runner: DoctorRunner) => {
      const sb = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" });
      const report = await doctor({ target: sb.vault, pluginRoot: sb.vault, runner });
      sb.cleanup();
      return report.results.find((c) => c.id === "D11");
    };

    test("zero unresolved links → pass", async () => {
      const check = await d11(() => ({ ok: true, stdout: '{"wiki/a.md":{}}' }));
      expect(check?.status).toBe("pass");
    });

    test("dangling links → warn with the count and a lint hint", async () => {
      const check = await d11(() => ({
        ok: true,
        stdout: '{"wiki/a.md":{"Missing Page":1,"Ghost":2},"wiki/b.md":{"Missing Page":1}}',
      }));
      expect(check?.status).toBe("warn");
      expect(check?.message).toContain("3 unresolved");
      expect(check?.hint).toContain("lint");
    });

    test("double-encoded eval output is unwrapped", async () => {
      const check = await d11(() => ({
        ok: true,
        stdout: JSON.stringify('{"wiki/a.md":{"Missing Page":1}}'),
      }));
      expect(check?.status).toBe("warn");
      expect(check?.message).toContain("1 unresolved");
    });

    test("CLI unavailable → skip, never fail", async () => {
      const check = await d11(noCli);
      expect(check?.status).toBe("skip");
    });

    test("unparseable CLI output → skip, never fail", async () => {
      const check = await d11(() => ({ ok: true, stdout: "Uncaught TypeError: app is gone" }));
      expect(check?.status).toBe("skip");
    });

    test("the runner receives the obsidian eval call with --vault", async () => {
      const calls: Array<{ cmd: string; args: readonly string[] }> = [];
      const sb = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" });
      await doctor({
        target: sb.vault,
        pluginRoot: sb.vault,
        runner: (cmd, args) => {
          calls.push({ cmd, args });
          return { ok: false, stdout: "" };
        },
      });
      sb.cleanup();
      expect(calls).toHaveLength(1);
      expect(calls[0]?.cmd).toBe("obsidian");
      expect(calls[0]?.args).toContain("--vault");
      expect(calls[0]?.args.some((a) => a.includes("unresolvedLinks"))).toBe(true);
    });
  });

  describe("D12 — strict-tree conformance (ADR-0036)", () => {
    const page = (parent: string, title: string): string =>
      `---\ntitle: "${title}"\nparent: "${parent}"\ntags: []\n---\n# ${title}\n`;

    test("a spine-only vault → pass", async () => {
      const sb = makeVault({
        "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
        "wiki/index.md": '---\ntitle: "Wiki Index"\ntype: index\nparent: ""\ntags: []\n---\n',
        "wiki/a/a.md": page("[[index|Wiki Index]]", "A"),
        "wiki/a/p1.md": page("[[a|A]]", "P1"),
      });
      const report = await doctor({ target: sb.vault, pluginRoot: sb.vault, runner: noCli });
      expect(report.results.find((c) => c.id === "D12")?.status).toBe("pass");
      sb.cleanup();
    });

    test("a cross-tree edge → warn with a fix hint", async () => {
      const sb = makeVault({
        "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
        "wiki/index.md": '---\ntitle: "Wiki Index"\ntype: index\nparent: ""\ntags: []\n---\n',
        "wiki/a/a.md": page("[[index|Wiki Index]]", "A"),
        "wiki/a/p1.md": '---\ntitle: "P1"\nparent: "[[a|A]]"\ntags: []\n---\n# P1\nlinks [[p2|P2]] across\n',
        "wiki/b/b.md": page("[[index|Wiki Index]]", "B"),
        "wiki/b/p2.md": page("[[b|B]]", "P2"),
      });
      const report = await doctor({ target: sb.vault, pluginRoot: sb.vault, runner: noCli });
      const d12 = report.results.find((c) => c.id === "D12");
      expect(d12?.status).toBe("warn");
      expect(d12?.message).toContain("cross-tree=1");
      expect(d12?.hint).toContain("fix");
      sb.cleanup();
    });

    test("no wiki/ → skip", async () => {
      const sb = makeVault({ "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n" });
      const report = await doctor({ target: sb.vault, pluginRoot: sb.vault, runner: noCli });
      expect(report.results.find((c) => c.id === "D12")?.status).toBe("skip");
      sb.cleanup();
    });
  });
});
