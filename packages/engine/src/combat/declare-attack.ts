import {
  DomainError,
  err,
  ok,
  type ApplyResult,
  type Card,
  type DeclareAttackAction,
  type DuelState,
  type Result,
  type ZoneReference,
} from "@yugioh/shared";

import { createEvent, openReactionWindow } from "../events/index.ts";
import { getOpponent } from "../spells/opponent.ts";
import { isFirstDuelTurn } from "../turn/first-turn.ts";

const ATTACK_POSITIONS = new Set(["attack_face_up", "attack_face_down"]);

/**
 * Declares an attack (motor-duelo-1x1 F11): validates the attacker/target and
 * opens a reaction window on `onAttackDeclared` — never applies damage or
 * destruction itself (that is `resolveAttack`, a separate action, spec
 * Decision 1). Assumes `apply` already confirmed the "battle" phase, the
 * active player and the absence of an open reaction window (same discipline
 * as F08/F09, spec Decision 4).
 */
export function declareAttack(
  state: DuelState,
  action: DeclareAttackAction,
): Result<ApplyResult, DomainError> {
  if (isFirstDuelTurn(state)) {
    return err(
      new DomainError("Attacking is not allowed on the duel's first turn.", "first_turn_attack_forbidden", {
        turn: state.turn,
      }),
    );
  }

  const activePlayer = state.activePlayer;
  const opponent = getOpponent(activePlayer);
  const attackerZone = state.players[activePlayer].field.monsters[action.attackerZoneIndex];

  if (!attackerZone.occupied) {
    return err(
      new DomainError("The attacker's zone is empty.", "attacker_zone_empty", {
        zoneIndex: action.attackerZoneIndex,
      }),
    );
  }

  if (!ATTACK_POSITIONS.has(attackerZone.position)) {
    return err(
      new DomainError(
        "A monster in defense position cannot attack.",
        "attacker_not_in_attack_position",
        { position: attackerZone.position },
      ),
    );
  }

  if (attackerZone.hasAttacked) {
    return err(
      new DomainError("This monster already attacked this turn.", "attacker_already_attacked", {
        zoneIndex: action.attackerZoneIndex,
      }),
    );
  }

  const targetZoneIndex = action.targetZoneIndex;

  if (targetZoneIndex !== undefined) {
    const targetZone = state.players[opponent].field.monsters[targetZoneIndex];
    if (!targetZone.occupied) {
      return err(
        new DomainError("The target zone is empty.", "target_zone_empty", { zoneIndex: targetZoneIndex }),
      );
    }
  } else {
    const opponentHasMonsters = state.players[opponent].field.monsters.some((zone) => zone.occupied);
    if (opponentHasMonsters) {
      return err(
        new DomainError(
          "There are monsters to attack — direct attack is unavailable.",
          "direct_attack_blocked_by_monsters",
          {},
        ),
      );
    }
  }

  const attackerZoneRef: ZoneReference = { player: activePlayer, zoneType: "monster", index: action.attackerZoneIndex };
  const involvedCards: Card[] = [attackerZone.card];
  const involvedZones: ZoneReference[] = [attackerZoneRef];

  if (targetZoneIndex !== undefined) {
    const targetZone = state.players[opponent].field.monsters[targetZoneIndex];
    if (targetZone.occupied) {
      involvedCards.push(targetZone.card);
    }
    involvedZones.push({ player: opponent, zoneType: "monster", index: targetZoneIndex });
  }

  const event = createEvent({
    type: "onAttackDeclared",
    originPlayer: activePlayer,
    involvedCards,
    involvedZones,
  });

  const opened = openReactionWindow(state, event, opponent);
  if (!opened.ok) {
    throw new Error("Unreachable: apply already guaranteed no reaction window is open.");
  }

  return ok({ state: opened.value, events: [event] });
}
