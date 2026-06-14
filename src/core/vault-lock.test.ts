/**
 * Tests for vault-lock.ts — the advisory per-vault mutex.
 *
 * Contracts exercised:
 *   - acquireVaultLockSync acquires and release returns the lock.
 *   - withVaultLockSync forwards the return value of fn().
 *   - C02: re-entrant acquireVaultLockSync on the same vault throws explicitly
 *     (was a silent no-op; now surfaces the caller bug at development time).
 *   - withVaultLockSync on distinct vaults is independent (no cross-vault blocking).
 *   - withVaultLockSync releases the lock even when fn() throws.
 *
 * Note: the in-process mutex is trivially available in a single-threaded
 * synchronous context (no concurrent callers can hold it simultaneously).
 * These tests exercise the interface contract and the exception-safety guarantee.
 * Cross-process flock coverage lives in tests/scripts/protect-raw.bats via the
 * bash companion vault-lock.sh.
 */

import { test, expect, describe } from "bun:test";
import { acquireVaultLockSync, withVaultLockSync } from "./vault-lock.ts";

describe("acquireVaultLockSync", () => {
  test("acquires and releases a lock for a vault path", () => {
    const vault = "/tmp/test-vault-lock-a";
    const release = acquireVaultLockSync(vault);
    expect(typeof release).toBe("function");
    // Releasing must not throw.
    expect(() => release()).not.toThrow();
  });

  test("C02: re-entrant acquisition on the same vault throws (explicit caller-bug signal)", () => {
    // Re-entrant withVaultLockSync on the same vault in synchronous code is a
    // programming error. The old code silently returned a no-op release (the
    // latent bug: the queue was never drained and the violation was invisible).
    // The fix makes the violation explicit — a throw that surfaces immediately.
    const vault = "/tmp/test-vault-lock-reentrant-c02";
    const release1 = acquireVaultLockSync(vault);
    try {
      // Re-entrant call on the same vault must throw.
      expect(() => acquireVaultLockSync(vault)).toThrow("re-entrant acquisition");
    } finally {
      // Ensure the lock is always released regardless of test outcome.
      release1();
    }
  });
});

describe("withVaultLockSync", () => {
  test("forwards the return value of fn()", () => {
    const result = withVaultLockSync("/tmp/test-vault-lock-b", () => 42);
    expect(result).toBe(42);
  });

  test("forwards string return values", () => {
    const result = withVaultLockSync("/tmp/test-vault-lock-c", () => "hello");
    expect(result).toBe("hello");
  });

  test("releases the lock even when fn() throws", () => {
    const vault = "/tmp/test-vault-lock-throws";
    expect(() =>
      withVaultLockSync(vault, () => {
        throw new Error("test error");
      }),
    ).toThrow("test error");
    // After the throw, the lock must be released: a subsequent call must succeed.
    const result = withVaultLockSync(vault, () => "recovered");
    expect(result).toBe("recovered");
  });

  test("is independent across distinct vault paths", () => {
    // Locks on different vaults must not block each other.
    const r1 = withVaultLockSync("/tmp/vault-x", () => "x");
    const r2 = withVaultLockSync("/tmp/vault-y", () => "y");
    expect(r1).toBe("x");
    expect(r2).toBe("y");
  });

  test("supports nested calls on distinct vaults (no cross-vault deadlock)", () => {
    const outer = withVaultLockSync("/tmp/vault-outer", () => {
      const inner = withVaultLockSync("/tmp/vault-inner", () => "inner");
      return `outer+${inner}`;
    });
    expect(outer).toBe("outer+inner");
  });
});
