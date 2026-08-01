import {
  DomainError,
  err,
  ok,
  type ApplyResult,
  type DuelEvent,
  type DuelState,
  type MonsterPosition,
  type MonsterZone,
  type PlayerId,
  type Result,
  type ZoneIndex,
} from "@yugioh/shared";

import { closeReactionWindow, createEvent } from "../events/index.ts";
import { isFaceDown } from "../position/next-position.ts";
import { getOpponent } from "../spells/opponent.ts";
import { calculateEffectiveAtkDef } from "./calculate-effective-atk-def.ts";
import { neutralCombatProviders } from "./neutral-combat-providers.ts";
import { resolveCombatTable } from "./resolve-combat-table.ts";

function postureOf(position: MonsterPosition): "attack" | "defense" {
  return position === "attack_face_up" || position === "attack_face_down" ? "attack" : "defense";
}

type MonsterZoneTuple = readonly [MonsterZone, MonsterZone, MonsterZone, MonsterZone, MonsterZone];

function replaceMonsterZone(monsters: MonsterZoneTuple, index: ZoneIndex, zone: MonsterZone): MonsterZoneTuple {
  const [z0, z1, z2, z3, z4] = monsters;
  const pick = (i: number, current: MonsterZone) => (i === index ? zone : current);
  return [pick(0, z0), pick(1, z1), pick(2, z2), pick(3, z3), pick(4, z4)];
}

function withMonsterZone(state: DuelState, player: PlayerId, index: ZoneIndex, zone: MonsterZone): DuelState {
  const player_ = state.players[player];
  return {
    ...state,
    players: {
      ...state.players,
      [player]: {
        ...player_,
        field: { ...player_.field, monsters: replaceMonsterZone(player_.field.monsters, index, zone) },
      },
    },
  };
}

/**
 * Resolves the currently pending attack (motor-duelo-1x1 F11): closes the
 * reaction window opened by `declareAttack`, reveals a face-down defender,
 * calculates effective ATK/DEF, applies the FM combat table (destruction,
 * damage), and marks the surviving attacker as having attacked.
 */
export function resolveAttack(state: DuelState): Result<ApplyResult, DomainError> {
  if (state.pending?.event.type !== "onAttackDeclared") {
    return err(
      new DomainError("There is no pending attack to resolve.", "no_pending_attack_to_resolve", {}),
    );
  }

  const pendingEvent = state.pending.event;
  const [attackerZoneRef, targetZoneRef] = pendingEvent.involvedZones;
  if (attackerZoneRef === undefined) {
    throw new Error("Unreachable: onAttackDeclared always carries the attacker's zone.");
  }

  const closed = closeReactionWindow(state);
  if (!closed.ok) {
    throw new Error("Unreachable: state.pending was just confirmed to hold an onAttackDeclared window.");
  }

  let workingState = closed.value;
  const attackerPlayer = attackerZoneRef.player;
  const opponentPlayer = getOpponent(attackerPlayer);
  const events: DuelEvent[] = [];

  const attackerZone = workingState.players[attackerPlayer].field.monsters[attackerZoneRef.index];
  if (!attackerZone.occupied) {
    throw new Error("Unreachable: nothing can vacate the attacker's zone between declare and resolve.");
  }

  let defenderCard: (typeof attackerZone)["card"] | undefined;
  let defenderPosture: "attack" | "defense" | undefined;

  if (targetZoneRef !== undefined) {
    const targetZone = workingState.players[opponentPlayer].field.monsters[targetZoneRef.index];
    if (!targetZone.occupied) {
      throw new Error("Unreachable: nothing can vacate the target's zone between declare and resolve.");
    }

    let revealedZone = targetZone;
    if (isFaceDown(targetZone.position)) {
      const revealedPosition: MonsterPosition =
        targetZone.position === "attack_face_down" ? "attack_face_up" : "defense_face_up";
      revealedZone = { ...targetZone, position: revealedPosition };
      workingState = withMonsterZone(workingState, opponentPlayer, targetZoneRef.index, revealedZone);
      events.push(
        createEvent({
          type: "onFlip",
          originPlayer: opponentPlayer,
          involvedCards: [targetZone.card],
          involvedZones: [targetZoneRef],
        }),
      );
    }

    defenderCard = revealedZone.card;
    defenderPosture = postureOf(revealedZone.position);
  }

  const attackerEffective = calculateEffectiveAtkDef(
    attackerZone.card,
    { activeField: workingState.activeField, opponent: defenderCard ?? null },
    neutralCombatProviders,
  );
  const defenderEffective =
    defenderCard === undefined
      ? undefined
      : calculateEffectiveAtkDef(
          defenderCard,
          { activeField: workingState.activeField, opponent: attackerZone.card },
          neutralCombatProviders,
        );

  const combatResult = resolveCombatTable({
    attackerEffective,
    defenderEffective,
    defenderPosition: defenderPosture,
  });

  workingState = withMonsterZone(
    workingState,
    attackerPlayer,
    attackerZoneRef.index,
    combatResult.attackerDestroyed ? { occupied: false } : { ...attackerZone, hasAttacked: true },
  );

  if (targetZoneRef !== undefined && combatResult.defenderDestroyed) {
    workingState = withMonsterZone(workingState, opponentPlayer, targetZoneRef.index, { occupied: false });
  }

  if (combatResult.damage.toAttackerOwner > 0) {
    const owner = workingState.players[attackerPlayer];
    workingState = {
      ...workingState,
      players: {
        ...workingState.players,
        [attackerPlayer]: { ...owner, lp: Math.max(0, owner.lp - combatResult.damage.toAttackerOwner) },
      },
    };
  } else if (combatResult.damage.toDefenderOwner > 0) {
    const owner = workingState.players[opponentPlayer];
    workingState = {
      ...workingState,
      players: {
        ...workingState.players,
        [opponentPlayer]: { ...owner, lp: Math.max(0, owner.lp - combatResult.damage.toDefenderOwner) },
      },
    };
  }

  if (combatResult.damage.toAttackerOwner > 0) {
    events.push(
      createEvent({
        type: "onDamage",
        originPlayer: attackerPlayer,
        context: { toPlayer: attackerPlayer, amount: combatResult.damage.toAttackerOwner },
      }),
    );
  } else if (combatResult.damage.toDefenderOwner > 0) {
    events.push(
      createEvent({
        type: "onDamage",
        originPlayer: attackerPlayer,
        context: { toPlayer: opponentPlayer, amount: combatResult.damage.toDefenderOwner },
      }),
    );
  }

  if (combatResult.attackerDestroyed) {
    events.push(
      createEvent({
        type: "onDestroy",
        originPlayer: attackerPlayer,
        involvedCards: [attackerZone.card],
        involvedZones: [attackerZoneRef],
      }),
    );
  }
  if (targetZoneRef !== undefined && combatResult.defenderDestroyed && defenderCard !== undefined) {
    events.push(
      createEvent({
        type: "onDestroy",
        originPlayer: attackerPlayer,
        involvedCards: [defenderCard],
        involvedZones: [targetZoneRef],
      }),
    );
  }

  return ok({ state: workingState, events });
}
