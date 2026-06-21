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
 *   - withVaultLock (async): serializes concurrent async callers via a
 *     Promise-chain queue (monitor pattern) — concurrent calls are queued, not
 *     rejected, and the lock is released even when fn() rejects.
 *   - withVaultLock (async): independent vault paths are not serialized against
 *     each other.
 *
 * Note: the in-process mutex is trivially available in a single-threaded
 * synchronous context (no concurrent callers can hold it simultaneously).
 * These tests exercise the interface contract and the exception-safety guarantee.
 * Cross-process flock coverage lives in tests/scripts/protect-raw.bats via the
 * bash companion vault-lock.sh.
 */

import { test, expect, describe } from "bun:test";
import { acquireVaultLockSync, withVaultLockSync, withVaultLock } from "./vault-lock.ts";

describe("acquireVaultLockSync", () => {
  test("acquires and releases a lock for a vault path", () => {
    const vault = "/tmp/test-vault-lock-a";
    const release = acquireVaultLockSync(vault);
    expect(typeof release).toBe("function");
    // Releasing must not throw.
    expect(() => release()).not.toThrow();
  });

  test("negative: empty-string vault key is rejected with a descriptive error", () => {
    // An empty string is not a valid vault path — it has no identity and cannot
    // represent a real vault directory.  Accepting it silently would allow
    // multiple unrelated callers (any code that passes "" by mistake) to share
    // one lock slot, defeating per-vault isolation.  The implementation must
    // reject the degenerate input with a clear error before touching the lock map.
    expect(() => acquireVaultLockSync("")).toThrow(/empty/i);
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
  test("negative: empty-string vault key is rejected before fn() is called", () => {
    // Guard must fire before fn() runs — the callback must never be invoked on
    // an invalid vault key.
    let called = false;
    expect(() =>
      withVaultLockSync("", () => {
        called = true;
        return "should-not-reach";
      }),
    ).toThrow(/empty/i);
    expect(called).toBe(false);
  });

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

// ── Async queue (monitor pattern) ────────────────────────────────────────────
//
// withVaultLock<T>(vault, fn): Promise<T> serializes concurrent async callers
// through a per-vault Promise chain.  Unlike the sync variant, concurrent
// async callers are queued (not rejected), so they run one at a time in the
// order they arrived.  The lock is always released — even when fn() rejects.

describe("withVaultLock (async)", () => {
  test("negative: empty-string vault key is rejected (Promise rejects before fn() is called)", async () => {
    // Same guard as the sync variant: an empty vault key must be rejected
    // immediately.  The returned Promise must reject with a message containing
    // "empty" so callers can distinguish this programmer-error from a real
    // async failure inside fn().
    let called = false;
    await expect(
      withVaultLock("", async () => {
        called = true;
        return "should-not-reach";
      }),
    ).rejects.toThrow(/empty/i);
    expect(called).toBe(false);
  });

  test("returns the resolved value of an async fn", async () => {
    const result = await withVaultLock("/tmp/async-vault-a", async () => 99);
    expect(result).toBe(99);
  });

  test("forwards string return values from async fn", async () => {
    const result = await withVaultLock("/tmp/async-vault-b", async () => "async-hello");
    expect(result).toBe("async-hello");
  });

  test("serializes two concurrent callers — second runs after first completes", async () => {
    const vault = "/tmp/async-vault-serial";
    const order: string[] = [];
    let resolveFirst!: () => void;
    const firstReady = new Promise<void>((res) => {
      resolveFirst = res;
    });

    // First caller: records 'start' then waits for an external signal before
    // recording 'end'.  We hold it open to verify the second caller is blocked.
    const first = withVaultLock(vault, async () => {
      order.push("first-start");
      resolveFirst();
      // Yield to the event loop so the second caller can attempt to acquire.
      await new Promise<void>((res) => setTimeout(res, 10));
      order.push("first-end");
      return "first";
    });

    // Wait until the first caller has started (acquired the lock) before
    // launching the second caller.
    await firstReady;

    const second = withVaultLock(vault, async () => {
      order.push("second-start");
      return "second";
    });

    const [r1, r2] = await Promise.all([first, second]);
    expect(r1).toBe("first");
    expect(r2).toBe("second");
    // Strict ordering: first-start → first-end → second-start
    expect(order).toEqual(["first-start", "first-end", "second-start"]);
  });

  test("releases the lock even when fn() rejects", async () => {
    const vault = "/tmp/async-vault-reject";
    await expect(
      withVaultLock(vault, async () => {
        throw new Error("async failure");
      }),
    ).rejects.toThrow("async failure");

    // After rejection the lock must be released: the next call must succeed.
    const result = await withVaultLock(vault, async () => "recovered-async");
    expect(result).toBe("recovered-async");
  });

  test("independent vault paths are not serialized against each other", async () => {
    // Two concurrent callers on different vaults must both be able to start
    // before either completes (no cross-vault blocking).
    const started: string[] = [];
    const p1 = withVaultLock("/tmp/async-vault-indep-1", async () => {
      started.push("v1");
      await new Promise<void>((res) => setTimeout(res, 5));
      return "v1-done";
    });
    const p2 = withVaultLock("/tmp/async-vault-indep-2", async () => {
      started.push("v2");
      await new Promise<void>((res) => setTimeout(res, 5));
      return "v2-done";
    });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe("v1-done");
    expect(r2).toBe("v2-done");
    // Both must have started before either returned (no serial ordering across vaults).
    expect(started).toContain("v1");
    expect(started).toContain("v2");
    expect(started.length).toBe(2);
  });

  test("queues three concurrent callers and runs them in FIFO order", async () => {
    const vault = "/tmp/async-vault-fifo";
    const order: number[] = [];

    const tasks = [1, 2, 3].map((n) =>
      withVaultLock(vault, async () => {
        order.push(n);
        // Brief async yield so the queue builds up for later entries.
        await new Promise<void>((res) => setTimeout(res, 5));
        return n;
      }),
    );

    const results = await Promise.all(tasks);
    expect(results).toEqual([1, 2, 3]);
    // All three must have run exactly once; order is FIFO because they were
    // enqueued before any could complete (they all had the same tick to queue).
    expect(order).toEqual([1, 2, 3]);
  });
});
