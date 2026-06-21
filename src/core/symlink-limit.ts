/**
 * The symlink-resolution loop ceiling, shared by every path-confinement walk.
 *
 * Single source of truth (previously the literal `40` was re-declared in
 * firewall.ts, protect-raw-check.ts, and protect-raw-gate.ts). Linux's
 * MAXSYMLINKS is 40; the same ceiling bounds every `while (guard < … &&
 * isSymlink(target))` loop so a symlink cycle can never hang the resolver.
 */
export const SYMLINK_LOOP_MAX = 40;
