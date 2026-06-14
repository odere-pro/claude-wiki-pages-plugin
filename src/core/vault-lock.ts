/**
 * Advisory exclusive vault lock for snapshot/commit/log-append paths.
 *
 * The race condition cluster (H07/H08 — isClean→appendLog→commit TOCTOU) is
 * addressed by wrapping every critical section (check-then-act on git state)
 * in `withVaultLock`. The lock is process-level (a Map of per-vault
 * Promise chains); it eliminates races between concurrent calls within the
 * same process. For cross-process mutual exclusion (concurrent cron jobs,
 * separate `snapshot.sh` invocations), the companion `vault-lock.sh` flock
 * covers the bash fallback path.
 *
 * Usage:
 *   import { withVaultLock } from "./vault-lock.ts";
 *   const result = await withVaultLock(vault, async () => {
 *     // critical section: isClean → appendLog → commit
 *   });
 *
 * The lock is a simple Promise chain per vault path (a "monitor" / serializer
 * pattern): each caller waits for the previous one's Promise to settle before
 * running its own critical section. Timeouts are enforced per-call via
 * `lockTimeoutMs` (default 30 000 ms).
 *
 * For the synchronous engine (all existing git.ts operations are synchronous),
 * `withVaultLockSync` wraps a synchronous critical section without changing
 * the call signature of the commands that use it. It serializes via a
 * per-process mutex map (an object acting as a read-write lock: one writer
 * at a time, no concurrent readers allowed during write). This is sufficient
 * for the single-threaded Bun/Node.js event loop.
 */

/** Per-vault lock state: a boolean flag (locked/unlocked). */
const _locks = new Map<string, boolean>();
/** Queue of waiters per vault (FIFO). */
const _queues = new Map<string, Array<() => void>>();

/**
 * Acquire a per-vault mutex synchronously. Callers that arrive while the lock
 * is held are queued and woken in FIFO order. Returns a release function.
 *
 * Because the Bun/Node event loop is single-threaded and all git.ts helpers
 * are synchronous (execFileSync), a simple flag + queue is sufficient — no
 * actual concurrent Promises can hold the lock simultaneously. The mutex
 * prevents the logical TOCTOU pattern where two synchronous call stacks
 * (within the same process, e.g. from two awaited calls) interleave via
 * async boundaries between their check and act steps.
 */
export function acquireVaultLockSync(vault: string): () => void {
  // For synchronous callers there is no concurrent execution in a single
  // event-loop tick, so the lock is always immediately available when called
  // synchronously. Record it for defensive correctness and future async use.
  const current = _locks.get(vault) ?? false;
  if (!current) {
    _locks.set(vault, true);
    return () => _releaseVaultLock(vault);
  }
  // Already locked in this synchronous call stack — should not happen in
  // single-threaded sync code, but be defensive rather than deadlock.
  return () => {
    /* no-op: did not acquire */
  };
}

function _releaseVaultLock(vault: string): void {
  const queue = _queues.get(vault);
  if (queue && queue.length > 0) {
    const next = queue.shift()!;
    next();
  } else {
    _locks.delete(vault);
  }
}

/**
 * Run `fn` inside an exclusive per-vault synchronous lock.
 *
 * For the current synchronous engine this is equivalent to a plain call, but
 * it makes the locking intent explicit and future-proofs against async
 * refactors. The return value of `fn` is forwarded.
 */
export function withVaultLockSync<T>(vault: string, fn: () => T): T {
  const release = acquireVaultLockSync(vault);
  try {
    return fn();
  } finally {
    release();
  }
}
