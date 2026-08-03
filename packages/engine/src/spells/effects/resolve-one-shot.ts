import {
  matchesClassFilter,
  type ApplyResult,
  type Card,
  type DuelEvent,
  type DuelState,
  type EffectTargets,
  type MonsterZone,
  type PlayerId,
  type SpellEffect,
  type SpellZone,
  type ZoneIndex,
  type ZoneReference,
} from "@yugioh/shared";

import { createEvent } from "../../events/index.ts";
import { replaceZone } from "../../field/replace-zone.ts";
import { isFaceDown, nextPosition } from "../../position/next-position.ts";
import { attackLockUntilTurn, withAttackLock } from "./attack-lock.ts";
import { playersForSide } from "./players-for-side.ts";

const ZONE_INDEXES: readonly ZoneIndex[] = [0, 1, 2, 3, 4];

function withMonsterZone(
  state: DuelState,
  player: PlayerId,
  index: ZoneIndex,
  zone: MonsterZone,
): DuelState {
  const owner = state.players[player];
  return {
    ...state,
    players: {
      ...state.players,
      [player]: {
        ...owner,
        field: { ...owner.field, monsters: replaceZone(owner.field.monsters, index, zone) },
      },
    },
  };
}

function withSpellZone(
  state: DuelState,
  player: PlayerId,
  index: ZoneIndex,
  zone: SpellZone,
): DuelState {
  const owner = state.players[player];
  return {
    ...state,
    players: {
      ...state.players,
      [player]: {
        ...owner,
        field: { ...owner.field, spells: replaceZone(owner.field.spells, index, zone) },
      },
    },
  };
}

function destroyedEvent(source: Card, card: Card, zone: ZoneReference, origin: PlayerId): DuelEvent {
  return createEvent({
    type: "onDestroy",
    originPlayer: origin,
    involvedCards: [card],
    involvedZones: [zone],
    context: { cause: "spell", by: source.numero },
  });
}

/**
 * Sweeps the monster zones the effect reaches and empties every match. One
 * `onDestroy` per zone, never a batched event — the UI builds its animation
 * from `involvedZones[0]`, so a single aggregate event would animate only one
 * destruction.
 */
function destroyMonsters(
  state: DuelState,
  source: Card,
  targets: EffectTargets,
  caster: PlayerId,
): ApplyResult {
  let workingState = state;
  const events: DuelEvent[] = [];

  for (const player of playersForSide(targets.side, caster)) {
    for (const index of ZONE_INDEXES) {
      const zone = workingState.players[player].field.monsters[index];
      if (!zone.occupied || !matchesClassFilter(zone.card, targets.filter)) continue;

      workingState = withMonsterZone(workingState, player, index, { occupied: false });
      events.push(
        destroyedEvent(source, zone.card, { player, zoneType: "monster", index }, caster),
      );
    }
  }

  return { state: workingState, events };
}

/**
 * Sweeps the spell/trap zones the effect reaches. Face-down traps are removed
 * too — the effect does not distinguish, and the `onDestroy` reveals the card
 * that just left the field.
 */
function destroySpells(
  state: DuelState,
  source: Card,
  targets: EffectTargets,
  caster: PlayerId,
): ApplyResult {
  let workingState = state;
  const events: DuelEvent[] = [];

  for (const player of playersForSide(targets.side, caster)) {
    for (const index of ZONE_INDEXES) {
      const zone = workingState.players[player].field.spells[index];
      if (!zone.occupied || !matchesClassFilter(zone.card, targets.filter)) continue;

      workingState = withSpellZone(workingState, player, index, { occupied: false });
      events.push(destroyedEvent(source, zone.card, { player, zoneType: "spell", index }, caster));
    }
  }

  return { state: workingState, events };
}

/**
 * Turns every monster in a defense posture to attack, reusing `nextPosition`
 * so there is no second position table in the repository.
 *
 * `hasChangedPosition` is deliberately left untouched: it limits the owner's
 * own once-per-turn change, and a flip forced by another player's card is not
 * that play (`docs/spells/position-control.md` §3).
 */
function forceAttackPosition(
  state: DuelState,
  targets: EffectTargets,
  caster: PlayerId,
): ApplyResult {
  let workingState = state;
  const events: DuelEvent[] = [];

  for (const player of playersForSide(targets.side, caster)) {
    for (const index of ZONE_INDEXES) {
      const zone = workingState.players[player].field.monsters[index];
      if (!zone.occupied || !matchesClassFilter(zone.card, targets.filter)) continue;
      if (zone.position !== "defense_face_up" && zone.position !== "defense_face_down") continue;

      const reference: ZoneReference = { player, zoneType: "monster", index };
      const revealed = isFaceDown(zone.position);

      workingState = withMonsterZone(workingState, player, index, {
        ...zone,
        position: nextPosition(zone.position),
      });

      if (revealed) {
        events.push(
          createEvent({
            type: "onFlip",
            originPlayer: player,
            involvedCards: [zone.card],
            involvedZones: [reference],
          }),
        );
      }
      events.push(
        createEvent({
          type: "onPositionChange",
          originPlayer: player,
          involvedCards: [zone.card],
          involvedZones: [reference],
        }),
      );
    }
  }

  return { state: workingState, events };
}

/**
 * Applies a signed life-point delta. `amount` in the event is always a
 * positive magnitude; the direction and the origin live in `context.kind`, so
 * `EVENT_TYPES` stays closed at ten (`docs/spells/life-points.md` §3).
 *
 * LP is floored at zero exactly as combat damage is; there is no ceiling —
 * 8000 is the starting value, not a cap.
 */
function changeLifePoints(
  state: DuelState,
  effect: Extract<SpellEffect, { type: "life_points" }>,
  caster: PlayerId,
): ApplyResult {
  let workingState = state;
  const events: DuelEvent[] = [];

  for (const player of playersForSide(effect.side, caster)) {
    const owner = workingState.players[player];
    workingState = {
      ...workingState,
      players: {
        ...workingState.players,
        [player]: { ...owner, lp: Math.max(0, owner.lp + effect.delta) },
      },
    };
    events.push(
      createEvent({
        type: "onDamage",
        originPlayer: caster,
        context: {
          toPlayer: player,
          amount: Math.abs(effect.delta),
          kind: effect.delta < 0 ? "effect_damage" : "effect_heal",
        },
      }),
    );
  }

  return { state: workingState, events };
}

/** Bars a player from declaring attacks. Emits no event — the lock is state `declareAttack` reads. */
function applyAttackLock(
  state: DuelState,
  effect: Extract<SpellEffect, { type: "attack_lock" }>,
  caster: PlayerId,
): ApplyResult {
  let workingState = state;

  for (const player of playersForSide(effect.side, caster)) {
    workingState = withAttackLock(
      workingState,
      player,
      attackLockUntilTurn(state.turn, effect.turns),
    );
  }

  return { state: workingState, events: [] };
}

/**
 * Resolves an immediate card effect into a new state plus the events it
 * emitted (`docs/spells/README.md` §5). Pure and total: it opens no reaction
 * window and never removes the card from the hand — `activateSpell` does both
 * around it.
 *
 * Every sweep iterates `P1` then `P2`, zone `0 → 4`, independently of the
 * caster, which is what makes the event order deterministic.
 */
export function resolveOneShotEffect(
  state: DuelState,
  card: Card,
  effect: SpellEffect,
  caster: PlayerId,
): ApplyResult {
  switch (effect.type) {
    case "destroy_monsters":
      return destroyMonsters(state, card, effect.targets, caster);
    case "destroy_spells":
      return destroySpells(state, card, effect.targets, caster);
    case "force_attack_position":
      return forceAttackPosition(state, effect.targets, caster);
    case "life_points":
      return changeLifePoints(state, effect, caster);
    case "attack_lock":
      return applyAttackLock(state, effect, caster);
    case "equip_buff":
    case "terrain":
      // `activateSpell` routes these to `equip_card` / `play_field_spell`
      // before ever getting here, so reaching this arm is a programmer error.
      throw new Error(`Unreachable: ${effect.type} is not an immediate effect.`);
  }
}
