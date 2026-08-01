import {
  DomainError,
  err,
  ok,
  TOTAL_MONSTER_ZONES,
  type ApplyResult,
  type DuelState,
  type PlayerId,
  type Result,
  type SummonMonsterAction,
} from "@yugioh/shared";

import { createEvent, openReactionWindow } from "../events/index.ts";
import { hasUsedHandPlay, markHandPlayUsed } from "../turn/hand-play.ts";

const SUMMONABLE_TYPES = new Set(["monstro", "ritual"]);

function opponentOf(player: PlayerId): PlayerId {
  return player === "P1" ? "P2" : "P1";
}

/**
 * Summons a monster from `action.player`'s hand into a free monster zone
 * (motor-duelo-1x1 F08). Assumes `apply` already confirmed the "main" phase,
 * the active player and the absence of an open reaction window (spec
 * Decision 7) — only validates what is specifically its own: hand play
 * availability, card presence/type, and zone availability.
 */
export function summonMonster(
  state: DuelState,
  action: SummonMonsterAction,
): Result<ApplyResult, DomainError> {
  const player = state.players[action.player];

  if (hasUsedHandPlay(state, action.player)) {
    return err(
      new DomainError("The hand play for this turn was already used.", "hand_play_already_used", {
        player: action.player,
      }),
    );
  }

  const card = player.hand[action.handIndex];
  if (card === undefined) {
    return err(
      new DomainError("The card at the given hand index is not available.", "card_not_in_hand", {
        handIndex: action.handIndex,
      }),
    );
  }

  if (!SUMMONABLE_TYPES.has(card.tipo)) {
    return err(
      new DomainError(
        "Only cards of type 'monstro' or 'ritual' can occupy a monster zone.",
        "unsummonable_card_type",
        { tipo: card.tipo },
      ),
    );
  }

  const occupiedZones = player.field.monsters.filter((zone) => zone.occupied).length;
  if (occupiedZones === TOTAL_MONSTER_ZONES) {
    return err(
      new DomainError("There is no free monster zone.", "no_free_monster_zone", {
        player: action.player,
      }),
    );
  }

  if (player.field.monsters[action.zoneIndex]?.occupied) {
    return err(
      new DomainError("The chosen monster zone is already occupied.", "monster_zone_occupied", {
        player: action.player,
        zoneIndex: action.zoneIndex,
      }),
    );
  }

  const nextHand = player.hand.filter((_, index) => index !== action.handIndex);
  const summonedZone = {
    occupied: true as const,
    card,
    position: action.position,
    hasAttacked: false,
    hasChangedPosition: false,
  };
  const [z0, z1, z2, z3, z4] = player.field.monsters;
  const withZone = (index: number, zone: typeof z0) => (index === action.zoneIndex ? summonedZone : zone);
  const nextMonsters: typeof player.field.monsters = [
    withZone(0, z0),
    withZone(1, z1),
    withZone(2, z2),
    withZone(3, z3),
    withZone(4, z4),
  ];

  const summonedState: DuelState = {
    ...state,
    players: {
      ...state.players,
      [action.player]: {
        ...player,
        hand: nextHand,
        field: { ...player.field, monsters: nextMonsters },
      },
    },
  };

  const stateAfterHandPlay = markHandPlayUsed(summonedState, action.player);

  const isFaceUp = action.position === "attack_face_up" || action.position === "defense_face_up";
  const event = createEvent({
    type: isFaceUp ? "onSummon" : "onSet",
    originPlayer: action.player,
    involvedCards: [card],
    involvedZones: [{ player: action.player, zoneType: "monster", index: action.zoneIndex }],
    context: { position: action.position },
  });

  const opened = openReactionWindow(stateAfterHandPlay, event, opponentOf(action.player));
  if (!opened.ok) {
    throw new Error("Unreachable: apply already guaranteed no reaction window is open.");
  }

  return ok({ state: opened.value, events: [event] });
}
