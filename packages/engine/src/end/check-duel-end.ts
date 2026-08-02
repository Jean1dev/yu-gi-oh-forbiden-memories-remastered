import type { DuelOutcome, DuelState, PlayerId } from "@yugioh/shared";

import { getOpponent } from "../spells/opponent.ts";

function decisive(loser: PlayerId, reason: "lp_depleted" | "deck_out"): DuelOutcome {
  return { status: "decisive", winner: getOpponent(loser), loser, reason };
}

/**
 * Derives the duel's outcome from the conditions observable in the state
 * (motor-duelo-1x1 F12): life points at zero, and the deck-out flag F07
 * raises. Returns `undefined` while the duel is still running.
 *
 * Surrender is deliberately absent: it is a declaration, not something that
 * can be read back from the state, so `surrender` stamps its own outcome and
 * `stampOutcome` preserves it (spec Decision 3).
 *
 * The order below is total, so that any state — including one assembled by
 * hand from a snapshot (F05) — maps to exactly one outcome. Life points come
 * before deck-out because the PRD calls it the primary victory condition. In
 * practice the two can never both hold: `apply` freezes the duel on the very
 * transition where the first condition appears.
 *
 * Pure and total: reads three fields, allocates nothing else, never throws.
 */
export function checkDuelEnd(state: DuelState): DuelOutcome | undefined {
  const p1Depleted = state.players.P1.lp === 0;
  const p2Depleted = state.players.P2.lp === 0;

  if (p1Depleted && p2Depleted) {
    return { status: "draw", winner: null, loser: null, reason: "draw" };
  }
  if (p1Depleted) return decisive("P1", "lp_depleted");
  if (p2Depleted) return decisive("P2", "lp_depleted");

  if (state.deckOutPlayer !== undefined) return decisive(state.deckOutPlayer, "deck_out");

  return undefined;
}

/** Whether the duel has ended — `outcome` is what freezes the state (F12). */
export function isDuelOver(state: DuelState): boolean {
  return state.outcome !== undefined;
}
