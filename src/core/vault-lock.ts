/**
 * Advisory exclusive vault lock for snapshot/commit/log-append paths.
 *
 * The race condition cluster (H07/H08 — isClean→appendLog→commit TOCTOU) is
 * addressed by wrapping every critical section (check-then-act on git state)
 * in `withVaultLockSync` (sync callers) or `withVaultLock` (async callers).
 * Both are process-level, per-vault serializers: they eliminate races between
 * concurrent calls within the same process. For cross-process mutual exclusion
 * (concurrent cron jobs, separate `snapshot.sh` invocations), the companion
 * `vault-lock.sh` flock covers the bash fallback path.
 *
 * ## Sync path (`withVaultLockSync`)
 *
 * For the synchronous engine (all existing git.ts operations are synchronous),
 * `withVaultLockSync` wraps a synchronous critical section without changing
 * the call signature of the commands that use it. It serializes via a boolean
 * flag + FIFO queue per vault. Re-entrant acquisition in synchronous code is
 * detected and throws (C02) — a single sync call stack cannot block and then
 * resume, so re-entrance is a caller bug, not a race.
 *
 *   const result = withVaultLockSync(vault, () => { ... });
 *
 * ## Async path (`withVaultLock`) — N17 / monitor pattern
 *
 * For async callers (present and future — including any refactor that introduces
 * `await` in snapshot/propose/migrate paths), `withVaultLock` serializes via
 * a per-vault Promise chain (the "monitor" pattern): each caller appends its
 * critical section to a settled Promise for the vault, so at most one async
 * critical section runs at a time. Concurrent callers are queued (not rejected)
 * and run in FIFO arrival order. The lock is always released — even when fn()
 * rejects — so the chain never stalls.
 *
 *   const result = await withVaultLock(vault, async () => { ... });
 *
 * Both variants are per-vault: locks on different vault paths are fully
 * independent and never block each other.
 *
 * ## Single-mode invariant (cross-mode guard)
 *
 * The sync flag (`_locks`) and the async chain (`_asyncTails`) are independent
 * mechanisms, so on their own they would NOT mutually exclude: a
 * `withVaultLockSync` holder and a `withVaultLock` holder on the SAME vault
 * could run concurrently across an async boundary. No production caller mixes
 * the two modes today (every caller is sync), but the docstring above invites
 * future async refactors, which is exactly when the modes could mix and the
 * guarantee would silently break. To keep that latent footgun loud rather than
 * silent, a vault may be held in at most ONE mode at a time: acquiring a sync
 * lock while an async critical section is in flight (or vice versa) throws
 * immediately. `_asyncActive` tracks whether an async section is currently
 * executing for a vault so the sync path can see it.
 */

/** Per-vault lock state: a boolean flag (locked/unlocked). */
const _locks = new Map<string, boolean>();
/** Queue of waiters per vault (FIFO). */
const _queues = new Map<string, Array<() => void>>();

// ── Async monitor (Promise-chain serializer) — N17 ───────────────────────────
//
// One settled Promise per vault acts as the "tail" of the queue.  Each new
// caller chains onto the current tail: it waits for the previous critical
// section to settle (resolve OR reject), then runs its own section.  After the
// section completes (or throws), the chain tail advances to the new Promise so
// the next waiter can chain onto it.
//
// This is the standard JS/TS "async mutex via Promise chaining" (monitor)
// pattern.  It is O(1) per call, never blocks the event loop, and has no
// external dependencies.

/** Settled Promise tails per vault — the async queue head. */
const _asyncTails = new Map<string, Promise<unknown>>();
/**
 * Whether an async critical section (`withVaultLock` fn) is currently executing
 * for a vault. Set true just before `fn()` runs and cleared when it settles, so
 * the sync path can detect — and reject — a cross-mode acquisition while an
 * async section is in flight across an `await` boundary.
 */
const _asyncActive = new Map<string, boolean>();

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
 *
 * Re-entrancy (C02): if the same vault is already locked in the current
 * synchronous call stack, this is a programming error (a caller invoking
 * withVaultLockSync inside another withVaultLockSync for the same vault).
 * Rather than silently returning a no-op release (which was the original
 * latent bug — the outer lock would never be drained), we throw explicitly
 * so the bug surfaces immediately during development. In the single-threaded
 * sync Bun engine this can only happen via accidental nested calls; the
 * throw converts a silent failure into a loud one.
 */
export function acquireVaultLockSync(vault: string): () => void {
  if (!vault) {
    throw new Error(
      "vault-lock: empty vault key is not valid. " +
        "Every caller must supply a non-empty vault path to ensure per-vault isolation.",
    );
  }
  // Cross-mode guard: a vault held by an in-flight async critical section must
  // not also be acquired synchronously (the single-mode invariant). Throw loud
  // rather than let the two serializers run concurrently and unguarded.
  if (_asyncActive.get(vault)) {
    throw new Error(
      `vault-lock: cannot acquire a sync lock for vault "${vault}" while an async lock ` +
        "(withVaultLock) is held on the same vault. Hold a vault in one mode at a time.",
    );
  }
  const current = _locks.get(vault) ?? false;
  if (!current) {
    _locks.set(vault, true);
    return () => _releaseVaultLock(vault);
  }
  // Re-entrant acquisition in synchronous code is a caller bug.  Throw so
  // the violation is visible immediately rather than silently returning a
  // no-op that leaves the queue perpetually drained.
  throw new Error(
    `vault-lock: re-entrant acquisition for vault "${vault}". ` +
      "Nested withVaultLockSync calls on the same vault are not supported. " +
      "Restructure the caller to hold one lock across the whole critical section.",
  );
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

/**
 * Run `fn` inside an exclusive per-vault async lock (monitor / Promise-chain
 * serializer pattern — N17).
 *
 * Concurrent async callers for the same vault are queued via a per-vault
 * Promise chain and executed one at a time in FIFO arrival order.  The lock
 * is always released — even when `fn` rejects — so the chain never stalls.
 * Callers on different vault paths are fully independent and never block each
 * other.
 *
 * Usage:
 *   const result = await withVaultLock(vault, async () => {
 *     // critical section: isClean → appendLog → commit
 *   });
 */
export function withVaultLock<T>(vault: string, fn: () => Promise<T>): Promise<T> {
  if (!vault) {
    return Promise.reject(
      new Error(
        "vault-lock: empty vault key is not valid. " +
          "Every caller must supply a non-empty vault path to ensure per-vault isolation.",
      ),
    );
  }
  // Retrieve (or create) the settled tail for this vault.  We chain our
  // critical section onto the tail so this caller cannot start until all
  // previous callers for the same vault have settled.
  const tail = _asyncTails.get(vault) ?? Promise.resolve();

  // Run our critical section once the tail settles. At execution time enforce
  // the single-mode invariant (reciprocal to acquireVaultLockSync's guard): if
  // a sync lock is held on this vault, reject rather than run concurrently.
  // `_asyncActive` brackets fn() so a sync caller across an await sees us.
  const run = async (): Promise<T> => {
    if (_locks.get(vault)) {
      throw new Error(
        `vault-lock: cannot acquire an async lock for vault "${vault}" while a sync lock ` +
          "(withVaultLockSync) is held on the same vault. Hold a vault in one mode at a time.",
      );
    }
    _asyncActive.set(vault, true);
    try {
      return await fn();
    } finally {
      _asyncActive.delete(vault);
    }
  };

  // Build the new link in the chain.  `next` is our critical-section Promise.
  // We use a void-typed chain tail so error propagation from previous callers
  // does not bleed into this caller — each critical section stands alone.
  const next: Promise<T> = tail.then(run, run);

  // Advance the vault's tail to the new Promise, stripped of its value type
  // (so the Map stays homogeneous and errors do not propagate forward).
  // We suppress rejections on the stored tail so Node.js does not emit an
  // "unhandledRejection" for the queued promise — the actual rejection is
  // forwarded to the original caller via `next`.
  _asyncTails.set(
    vault,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );

  return next;
}
