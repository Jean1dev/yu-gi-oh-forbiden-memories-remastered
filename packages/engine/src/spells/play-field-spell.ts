import {
  DomainError,
  err,
  ok,
  type ApplyResult,
  type DuelState,
  type PlayFieldSpellAction,
  type Result,
} from "@yugioh/shared";

import { createEvent, openReactionWindow } from "../events/index.ts";
import { hasUsedHandPlay, markHandPlayUsed } from "../turn/hand-play.ts";
import { getOpponent } from "./opponent.ts";

/**
 * Plays a field-spell card from the active player's hand, replacing the
 * single `activeField` slot — always substitutable, never rejected for
 * "already occupied" (motor-duelo-1x1 F09). Assumes `apply` already
 * confirmed the absence of an open reaction window (spec Decision 10).
 */
export function playFieldSpell(
  state: DuelState,
  action: PlayFieldSpellAction,
): Result<ApplyResult, DomainError> {
  const player = state.players[state.activePlayer];

  if (hasUsedHandPlay(state, state.activePlayer)) {
    return err(
      new DomainError("The hand play for this turn was already used.", "hand_play_already_used", {
        player: state.activePlayer,
      }),
    );
  }

  const card = player.hand[action.handIndex];
  if (card === undefined) {
    return err(
      new DomainError("The card at the given hand index is not available.", "card_unavailable", {
        handIndex: action.handIndex,
      }),
    );
  }

  if (card.tipo !== "magica" || card.classe !== "Magic") {
    return err(
      new DomainError("This card is not a field-spell card.", "invalid_field_spell_card_type", {
        tipo: card.tipo,
        classe: card.classe,
      }),
    );
  }

  const nextHand = player.hand.filter((_, index) => index !== action.handIndex);

  const placedState: DuelState = {
    ...state,
    activeField: card,
    players: { ...state.players, [state.activePlayer]: { ...player, hand: nextHand } },
  };

  const stateAfterHandPlay = markHandPlayUsed(placedState, state.activePlayer);

  const event = createEvent({
    type: "onSet",
    originPlayer: state.activePlayer,
    involvedCards: [card],
    involvedZones: [],
    context: { target: "field" },
  });

  const opened = openReactionWindow(stateAfterHandPlay, event, getOpponent(state.activePlayer));
  if (!opened.ok) {
    throw new Error("Unreachable: apply already guaranteed no reaction window is open.");
  }

  return ok({ state: opened.value, events: [event] });
}
