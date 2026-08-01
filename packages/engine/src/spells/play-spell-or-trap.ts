import {
  DomainError,
  err,
  ok,
  TOTAL_SPELL_ZONES,
  type ApplyResult,
  type DuelState,
  type PlaySpellOrTrapAction,
  type Result,
} from "@yugioh/shared";

import { createEvent, openReactionWindow } from "../events/index.ts";
import { replaceZone } from "../field/replace-zone.ts";
import { hasUsedHandPlay, markHandPlayUsed } from "../turn/hand-play.ts";
import { getOpponent } from "./opponent.ts";

const SPELL_TRAP_TYPES = new Set(["armadilha", "equipamento", "magica"]);

/**
 * Places a magic/trap/equipment card from the active player's hand into a
 * free spell/trap zone (motor-duelo-1x1 F09). Assumes `apply` already
 * confirmed the absence of an open reaction window (spec Decision 10) —
 * only validates what is specifically its own.
 */
export function playSpellOrTrap(
  state: DuelState,
  action: PlaySpellOrTrapAction,
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

  if (!SPELL_TRAP_TYPES.has(card.tipo)) {
    return err(
      new DomainError(
        "This card cannot be placed in a spell/trap zone.",
        "invalid_spell_trap_card_type",
        { tipo: card.tipo },
      ),
    );
  }

  const occupiedZones = player.field.spells.filter((zone) => zone.occupied).length;
  if (occupiedZones === TOTAL_SPELL_ZONES) {
    return err(
      new DomainError("There is no space for this card.", "no_space_for_card", {
        player: state.activePlayer,
      }),
    );
  }

  if (player.field.spells[action.zoneIndex]?.occupied) {
    return err(
      new DomainError("The chosen zone is already occupied.", "zone_occupied", {
        player: state.activePlayer,
        zoneIndex: action.zoneIndex,
      }),
    );
  }

  const faceUp = card.tipo !== "armadilha";
  const nextHand = player.hand.filter((_, index) => index !== action.handIndex);
  const placedZone = { occupied: true as const, card, faceUp };
  const nextSpells = replaceZone(player.field.spells, action.zoneIndex, placedZone);

  const placedState: DuelState = {
    ...state,
    players: {
      ...state.players,
      [state.activePlayer]: {
        ...player,
        hand: nextHand,
        field: { ...player.field, spells: nextSpells },
      },
    },
  };

  const stateAfterHandPlay = markHandPlayUsed(placedState, state.activePlayer);

  const event = createEvent({
    type: "onSet",
    originPlayer: state.activePlayer,
    involvedCards: [card],
    involvedZones: [{ player: state.activePlayer, zoneType: "spell", index: action.zoneIndex }],
    context: { target: "spell_trap_zone", faceUp },
  });

  const opened = openReactionWindow(stateAfterHandPlay, event, getOpponent(state.activePlayer));
  if (!opened.ok) {
    throw new Error("Unreachable: apply already guaranteed no reaction window is open.");
  }

  return ok({ state: opened.value, events: [event] });
}
