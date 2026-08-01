import {
  DomainError,
  err,
  ok,
  INITIAL_HAND_SIZE,
  type ApplyResult,
  type Card,
  type DuelState,
  type Result,
} from "@yugioh/shared";

import { createEvent } from "../events/index.ts";

/**
 * Completes the active player's hand up to `INITIAL_HAND_SIZE`, drawing from
 * the top of the deck (index 0) one card at a time, and emits one `onDraw`
 * event per card drawn. If the deck runs out before the hand is complete,
 * stops there and marks `deckOutPlayer` (F12 consumes this signal later).
 * Pure and total: assumes the caller already confirmed `state.phase ===
 * "draw"` (that is what `advancePhase`'s switch does) — never checks it.
 */
export function drawUpToHandSize(state: DuelState): ApplyResult {
  const player = state.activePlayer;
  const current = state.players[player];
  const needed = Math.max(0, INITIAL_HAND_SIZE - current.hand.length);

  const drawnCards: Card[] = [];
  let remainingDeck = current.deck;
  let deckedOut = false;

  for (let i = 0; i < needed; i++) {
    const [top, ...rest] = remainingDeck;
    if (top === undefined) {
      deckedOut = true;
      break;
    }
    drawnCards.push(top);
    remainingDeck = rest;
  }

  const nextState: DuelState = {
    ...state,
    players: {
      ...state.players,
      [player]: { ...current, hand: [...current.hand, ...drawnCards], deck: remainingDeck },
    },
    ...(deckedOut ? { deckOutPlayer: player } : {}),
  };

  const events = drawnCards.map((card) =>
    createEvent({ type: "onDraw", originPlayer: player, involvedCards: [card] }),
  );

  return { state: nextState, events };
}

/**
 * Boundary entry point for any caller that invokes the draw logic outside
 * the normal turn cycle (F08/AI/tests): refuses with a `Result` error when
 * `state.phase !== "draw"`, otherwise delegates to `drawUpToHandSize`.
 */
export function resolveDrawPhase(state: DuelState): Result<ApplyResult, DomainError> {
  if (state.phase !== "draw") {
    return err(
      new DomainError(
        "Compra solicitada fora da fase de Compra.",
        "draw_outside_draw_phase",
        { phase: state.phase },
      ),
    );
  }

  return ok(drawUpToHandSize(state));
}
