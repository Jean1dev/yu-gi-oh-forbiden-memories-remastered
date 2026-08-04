import {
  DomainError,
  err,
  getSpellEffect,
  ok,
  spellPlayMode,
  type ActivateSpellAction,
  type ApplyResult,
  type DuelState,
  type Result,
} from "@yugioh/shared";

import { createEvent, openReactionWindow } from "../events/index.ts";
import { hasUsedHandPlay, markHandPlayUsed } from "../turn/hand-play.ts";
import { resolveOneShotEffect } from "./effects/resolve-one-shot.ts";
import { getOpponent } from "./opponent.ts";

/**
 * Plays a card whose effect resolves immediately (`docs/spells/README.md` §4).
 * Assumes `apply` already confirmed the phase and the absence of an open
 * reaction window.
 *
 * The card is consumed: it leaves the hand and occupies no zone — there is no
 * graveyard in `DuelState`, so it simply leaves play.
 *
 * The effect resolves **before** the reaction window opens. That order is
 * forced by the surrounding system, not chosen for style: `apply` knows only
 * one window-consuming action (`resolve_attack`), and the shipped orchestrator
 * closes every other window with a bare `closeReactionWindow`, so a deferred
 * resolution would be silently discarded. Resolving first also lets
 * `stampOutcome` end the duel in the same transition when the effect is lethal.
 */
export function activateSpell(
  state: DuelState,
  action: ActivateSpellAction,
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

  const effect = getSpellEffect(card.numero);
  if (effect === undefined || spellPlayMode(card) !== "one_shot") {
    return err(
      new DomainError("This card has no effect to activate.", "invalid_activation_card_type", {
        numero: card.numero,
        tipo: card.tipo,
      }),
    );
  }

  const consumedState: DuelState = {
    ...state,
    players: {
      ...state.players,
      [state.activePlayer]: {
        ...player,
        hand: player.hand.filter((_, index) => index !== action.handIndex),
      },
    },
  };

  const resolved = resolveOneShotEffect(consumedState, card, effect, state.activePlayer);
  const stateAfterHandPlay = markHandPlayUsed(resolved.state, state.activePlayer);

  const activation = createEvent({
    type: "onSet",
    originPlayer: state.activePlayer,
    involvedCards: [card],
    context: { target: "activation", effect: effect.type },
  });

  const opened = openReactionWindow(
    stateAfterHandPlay,
    activation,
    getOpponent(state.activePlayer),
  );
  if (!opened.ok) {
    throw new Error("Unreachable: apply already guaranteed no reaction window is open.");
  }

  return ok({ state: opened.value, events: [activation, ...resolved.events] });
}
