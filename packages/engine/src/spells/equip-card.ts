import {
  DomainError,
  err,
  getSpellEffect,
  ok,
  type ApplyResult,
  type DuelState,
  type EquipCardAction,
  type Result,
} from "@yugioh/shared";

import { createEvent, openReactionWindow } from "../events/index.ts";
import { replaceZone } from "../field/replace-zone.ts";
import { hasUsedHandPlay, markHandPlayUsed } from "../turn/hand-play.ts";
import { getOpponent } from "./opponent.ts";

/**
 * Attaches an equip card from the active player's hand to one of their own
 * monsters (`docs/spells/equip-buffs.md`). Assumes `apply` already confirmed
 * the phase and the absence of an open reaction window.
 *
 * The card leaves the hand and is pushed onto the host's `equips` — it never
 * occupies a spell zone, which is what makes it vanish with a destroyed host.
 * No bonus is computed here: `resolveAttack` derives it at combat time, so
 * equipping a class-restricted card onto an ineligible monster is a legal play
 * that simply contributes 0.
 */
export function equipCard(
  state: DuelState,
  action: EquipCardAction,
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

  if (getSpellEffect(card.numero)?.type !== "equip_buff") {
    return err(
      new DomainError("This card cannot be equipped to a monster.", "invalid_equip_card_type", {
        numero: card.numero,
        tipo: card.tipo,
      }),
    );
  }

  const { targetZone } = action;

  if (targetZone.zoneType !== "monster") {
    return err(
      new DomainError(
        "An equip card must target a monster zone.",
        "equip_target_not_monster_zone",
        { zoneType: targetZone.zoneType },
      ),
    );
  }

  if (targetZone.player !== state.activePlayer) {
    return err(
      new DomainError("Only your own monster can be equipped.", "equip_target_not_owned", {
        activePlayer: state.activePlayer,
        targetPlayer: targetZone.player,
      }),
    );
  }

  const hostZone = player.field.monsters[targetZone.index];
  if (hostZone === undefined || !hostZone.occupied) {
    return err(
      new DomainError("There is no monster in the target zone.", "equip_target_zone_empty", {
        zoneIndex: targetZone.index,
      }),
    );
  }

  const nextHand = player.hand.filter((_, index) => index !== action.handIndex);
  const equippedZone = { ...hostZone, equips: [...hostZone.equips, card] };
  const nextMonsters = replaceZone(player.field.monsters, targetZone.index, equippedZone);

  const equippedState: DuelState = {
    ...state,
    players: {
      ...state.players,
      [state.activePlayer]: {
        ...player,
        hand: nextHand,
        field: { ...player.field, monsters: nextMonsters },
      },
    },
  };

  const stateAfterHandPlay = markHandPlayUsed(equippedState, state.activePlayer);

  const event = createEvent({
    type: "onSet",
    originPlayer: state.activePlayer,
    involvedCards: [card],
    involvedZones: [targetZone],
    context: { target: "equip", host: hostZone.card.numero },
  });

  const opened = openReactionWindow(stateAfterHandPlay, event, getOpponent(state.activePlayer));
  if (!opened.ok) {
    throw new Error("Unreachable: apply already guaranteed no reaction window is open.");
  }

  return ok({ state: opened.value, events: [event] });
}
