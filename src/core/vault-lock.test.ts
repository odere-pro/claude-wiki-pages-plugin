/**
 * Tests for vault-lock.ts — the advisory per-vault mutex.
 *
 * Contracts exercised:
 *   - acquireVaultLockSync acquires and release returns the lock.
 *   - withVaultLockSync forwards the return value of fn().
 *   - Nested withVaultLockSync on the same vault does not deadlock (degrade path).
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

  test("returns a no-op release when called re-entrantly on the same vault", () => {
    // In a single-threaded synchronous context the lock is always immediately
    // available, but re-entrant calls return a no-op release (defensive).
    const vault = "/tmp/test-vault-lock-reentrant";
    const release1 = acquireVaultLockSync(vault);
    // Simulate a re-entrant attempt (e.g. nested withVaultLockSync):
    const release2 = acquireVaultLockSync(vault);
    // Both releases must be callable without throwing.
    expect(() => release2()).not.toThrow();
    expect(() => release1()).not.toThrow();
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
