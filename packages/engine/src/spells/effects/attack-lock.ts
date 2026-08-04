import { TURNS_PER_ROUND, type AttackLock, type DuelState, type PlayerId } from "@yugioh/shared";

/**
 * The first turn on which a player locked *now* may attack again.
 *
 * `DuelState.turn` counts player turns, not rounds, and the players alternate,
 * so N of the locked player's own turns span `N * TURNS_PER_ROUND` increments
 * (`docs/spells/attack-lock.md` §3).
 */
export function attackLockUntilTurn(currentTurn: number, turns: number): number {
  return currentTurn + turns * TURNS_PER_ROUND;
}

/**
 * Replace-or-append: a player never accumulates two locks, which is also what
 * `DuelStateSchema` refines. Recasting therefore restarts the count from the
 * current turn rather than stacking.
 */
export function withAttackLock(state: DuelState, player: PlayerId, untilTurn: number): DuelState {
  const existing = state.attackLocks ?? [];
  const lock: AttackLock = { player, untilTurn };
  const replaced = existing.some((entry) => entry.player === player);

  return {
    ...state,
    attackLocks: replaced
      ? existing.map((entry) => (entry.player === player ? lock : entry))
      : [...existing, lock],
  };
}

/** Whether `player` is currently barred from declaring an attack. */
export function isAttackLocked(state: DuelState, player: PlayerId): boolean {
  const lock = state.attackLocks?.find((entry) => entry.player === player);
  return lock !== undefined && state.turn < lock.untilTurn;
}
