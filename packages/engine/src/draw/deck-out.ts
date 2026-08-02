import type { DuelState, PlayerId } from "@yugioh/shared";

/** Whether any player has failed to complete a mandatory draw this duel. */
export function hasDeckedOut(state: DuelState): boolean {
  return state.deckOutPlayer !== undefined;
}

/** The player who decked out, or `undefined` if none has yet. */
export function getDeckOutPlayer(state: DuelState): PlayerId | undefined {
  return state.deckOutPlayer;
}
