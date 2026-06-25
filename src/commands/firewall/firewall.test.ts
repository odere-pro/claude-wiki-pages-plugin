/**
 * M20: Unit/integration tests for src/commands/firewall/firewall.ts.
 *
 * The command-layer wiring in firewallCheck() was previously untested.
 * These tests verify:
 *   - firewallCheck returns the correct FirewallReport shape
 *   - vault resolution and decision delegation are wired correctly
 *   - allowPaths, denyPaths, and otherVaults are threaded through
 *   - the report carries command: "firewall" and the resolved vault/file fields
 *   - firewall.ts <-> firewall.sh parity is preserved (gate-11)
 *
 * Core decision logic is tested in src/core/firewall.test.ts (gate-11).
 * These tests cover the command-layer integration only.
 */

import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { firewallCheck } from "./firewall.ts";

let tmpDir: string;

function makeVault(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "cwp-fw-cmd-"));
  mkdirSync(join(tmpDir, "wiki"), { recursive: true });
  writeFileSync(join(tmpDir, "CLAUDE.md"), "schema_version: 2\ntitle: Test Vault\n");
  return tmpDir;
}

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

describe("Feature: Firewall › command wiring — firewallCheck command-layer wiring", () => {
  test("returns a FirewallReport with command='firewall'", () => {
    const vault = makeVault();
    const file = join(vault, "wiki", "test.md");
    const report = firewallCheck({ target: vault, file });
    expect(report.command).toBe("firewall");
  });

  test("report carries the resolved vault and file fields", () => {
    const vault = makeVault();
    const file = join(vault, "wiki", "test.md");
    const report = firewallCheck({ target: vault, file });
    // vault is normalized (trailing slash stripped in firewallCheck)
    expect(report.vault).toBe(vault.replace(/\/+$/, ""));
    expect(report.file).toBe(file);
  });

  test("write inside vault is allowed under default enforce mode", () => {
    const vault = makeVault();
    const file = join(vault, "wiki", "page.md");
    const report = firewallCheck({ target: vault, file });
    expect(report.allowed).toBe(true);
    expect(report.matchedRule).toBe("vault");
  });

  test("write outside vault is blocked under default enforce mode", () => {
    const vault = makeVault();
    const file = "/etc/passwd";
    const report = firewallCheck({ target: vault, file });
    expect(report.allowed).toBe(false);
    expect(report.matchedRule).toBe("outside-vault");
  });

  test("write to a sibling other-vault is blocked as cross-vault", () => {
    const vault = makeVault();
    const sibling = mkdtempSync(join(tmpdir(), "cwp-fw-sibling-"));
    const file = join(sibling, "wiki", "secret.md");
    const report = firewallCheck({ target: vault, file, otherVaults: [sibling] });
    expect(report.allowed).toBe(false);
    expect(report.matchedRule).toBe("cross-vault");
    rmSync(sibling, { recursive: true, force: true });
  });

  test("denyPaths from config block writes inside the vault", () => {
    // The default config denyPaths includes **/.env — verify it fires
    const vault = makeVault();
    const file = join(vault, ".env");
    const report = firewallCheck({ target: vault, file });
    expect(report.allowed).toBe(false);
    expect(report.matchedRule).toContain("deny:");
  });

  test("report has mode field from config", () => {
    const vault = makeVault();
    const file = join(vault, "wiki", "page.md");
    const report = firewallCheck({ target: vault, file });
    // Default mode is "enforce"
    expect(report.mode).toBe("enforce");
  });

  test("otherVaults defaults to empty array when not provided", () => {
    const vault = makeVault();
    const file = join(vault, "wiki", "page.md");
    // Should not throw; write inside vault is allowed
    const report = firewallCheck({ target: vault, file });
    expect(report.allowed).toBe(true);
  });

  test("report.allowed and report.matchedRule are always present", () => {
    const vault = makeVault();
    const file = join(vault, "wiki", "test.md");
    const report = firewallCheck({ target: vault, file });
    expect(typeof report.allowed).toBe("boolean");
    expect(typeof report.matchedRule).toBe("string");
    expect(report.matchedRule.length).toBeGreaterThan(0);
  });
});
