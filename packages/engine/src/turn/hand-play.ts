import type { DuelState, PlayerId } from "@yugioh/shared";

/** Whether `player` has already used their one hand play this turn. */
export function hasUsedHandPlay(state: DuelState, player: PlayerId): boolean {
  return state.players[player].handPlayUsed;
}

/**
 * Marks `player` as having used their hand play this turn. Idempotent:
 * calling it again on an already-marked player returns an equivalent state.
 * No consumer yet (F08/F09 will call this before accepting their own action).
 */
export function markHandPlayUsed(state: DuelState, player: PlayerId): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [player]: { ...state.players[player], handPlayUsed: true },
    },
  };
}
