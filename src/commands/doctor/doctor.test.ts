import { test, expect, describe } from "bun:test";
import { execFileSync } from "node:child_process";
import { doctor, doctorExit, type DoctorRunner } from "./doctor.ts";
import { makeVault, CLEAN_VAULT } from "../../test-helpers/sandbox/vault.ts";

/** D11 stays deterministic in tests: never let it reach a real `obsidian`. */
const noCli: DoctorRunner = () => ({ ok: false, stdout: "" });

describe("doctor", () => {
  test("a healthy vault passes the vault-scoped checks", () => {
    const sb = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" });
    execFileSync("git", ["init"], { cwd: sb.vault, stdio: "ignore" });

    const report = doctor({ target: sb.vault, pluginRoot: sb.vault, runner: noCli });
    const byId = Object.fromEntries(report.results.map((c) => [c.id, c.status]));

    expect(byId["D01"]).toBe("pass"); // vault exists
    expect(byId["D02"]).toBe("pass"); // schema_version 1
    expect(byId["D05"]).toBe("pass"); // git repo
    expect(byId["D09"]).toBe("pass"); // verify clean
    expect(report.results).toHaveLength(11);
    sb.cleanup();
  });

  test("a missing vault fails D01 and --strict exits 3", () => {
    const report = doctor({ target: "/no/such/vault-xyz" });
    expect(report.results.find((c) => c.id === "D01")?.status).toBe("fail");
    expect(report.worst).toBe("fail");
    expect(doctorExit(report, true)).toBe(3);
    expect(doctorExit(report, false)).toBe(0);
  });

  test("D05 distinguishes a vault covered by a parent repo from its own repo", () => {
    const sb = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" });
    execFileSync("git", ["init"], { cwd: sb.vault, stdio: "ignore" });
    const own = doctor({ target: sb.vault, pluginRoot: sb.vault, runner: noCli });
    expect(own.results.find((c) => c.id === "D05")?.message).toContain("its own git repo");
    sb.cleanup();

    // Vault nested inside a project repo: D05 still passes, names the parent root.
    const sb2 = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" }, { nest: "docs/vault" });
    execFileSync("git", ["init"], { cwd: sb2.root, stdio: "ignore" });
    const inherited = doctor({ target: sb2.vault, pluginRoot: sb2.vault, runner: noCli });
    const d05 = inherited.results.find((c) => c.id === "D05");
    expect(d05?.status).toBe("pass");
    expect(d05?.message).toContain("covered by the repo at");
    sb2.cleanup();
  });

  test("--fix initialises git (D05) on a non-repo vault", () => {
    const sb = makeVault(CLEAN_VAULT);
    const before = doctor({ target: sb.vault, pluginRoot: sb.vault, runner: noCli });
    expect(before.results.find((c) => c.id === "D05")?.status).toBe("warn");

    const after = doctor({ target: sb.vault, pluginRoot: sb.vault, fix: true, runner: noCli });
    expect(after.results.find((c) => c.id === "D05")?.status).toBe("fixed");
    sb.cleanup();
  });

  describe("D11 — Obsidian link parity (advisory)", () => {
    const d11 = (runner: DoctorRunner) => {
      const sb = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" });
      const report = doctor({ target: sb.vault, pluginRoot: sb.vault, runner });
      sb.cleanup();
      return report.results.find((c) => c.id === "D11");
    };

    test("zero unresolved links → pass", () => {
      const check = d11(() => ({ ok: true, stdout: '{"wiki/a.md":{}}' }));
      expect(check?.status).toBe("pass");
    });

    test("dangling links → warn with the count and a lint hint", () => {
      const check = d11(() => ({
        ok: true,
        stdout: '{"wiki/a.md":{"Missing Page":1,"Ghost":2},"wiki/b.md":{"Missing Page":1}}',
      }));
      expect(check?.status).toBe("warn");
      expect(check?.message).toContain("3 unresolved");
      expect(check?.hint).toContain("lint");
    });

    test("double-encoded eval output is unwrapped", () => {
      const check = d11(() => ({
        ok: true,
        stdout: JSON.stringify('{"wiki/a.md":{"Missing Page":1}}'),
      }));
      expect(check?.status).toBe("warn");
      expect(check?.message).toContain("1 unresolved");
    });

    test("CLI unavailable → skip, never fail", () => {
      const check = d11(noCli);
      expect(check?.status).toBe("skip");
    });

    test("unparseable CLI output → skip, never fail", () => {
      const check = d11(() => ({ ok: true, stdout: "Uncaught TypeError: app is gone" }));
      expect(check?.status).toBe("skip");
    });

    test("the runner receives the obsidian eval call with --vault", () => {
      const calls: Array<{ cmd: string; args: readonly string[] }> = [];
      const sb = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" });
      doctor({
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
});
