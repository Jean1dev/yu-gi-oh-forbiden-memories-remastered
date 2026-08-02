import type { DuelState } from "@yugioh/shared";

/**
 * Whether `state` is still in the duel's very first turn — the FM Phase 0
 * rule that blocks attack declaration (consumed by F11). No dedicated flag:
 * `turn` already carries this (F03 Decision 8).
 */
export function isFirstDuelTurn(state: DuelState): boolean {
  return state.turn === 1;
}
