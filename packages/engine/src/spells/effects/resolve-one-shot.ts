import {
  matchesClassFilter,
  type ApplyResult,
  type AtomicSpellEffect,
  type Card,
  type DuelEvent,
  type DuelState,
  type EffectSide,
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
import { isFaceDown, nextPosition, revealPosition } from "../../position/next-position.ts";
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
 * Empties every monster zone the effect reaches whose ATK is at or above
 * `minAtk` (661 Crush Card, "attack factors of 1500 or more"). A monster with
 * no ATK at all reads as 0, the same convention `calculateEffectiveAtkDef`
 * uses, and the comparison is against the printed ATK — a card that raises a
 * monster past the line does not feed it to Crush Card.
 */
function destroyMonstersByAtk(
  state: DuelState,
  source: Card,
  targets: EffectTargets,
  minAtk: number,
  caster: PlayerId,
): ApplyResult {
  let workingState = state;
  const events: DuelEvent[] = [];

  for (const player of playersForSide(targets.side, caster)) {
    for (const index of ZONE_INDEXES) {
      const zone = workingState.players[player].field.monsters[index];
      if (!zone.occupied || !matchesClassFilter(zone.card, targets.filter)) continue;
      if ((zone.card.atk ?? 0) < minAtk) continue;

      workingState = withMonsterZone(workingState, player, index, { occupied: false });
      events.push(
        destroyedEvent(source, zone.card, { player, zoneType: "monster", index }, caster),
      );
    }
  }

  return { state: workingState, events };
}

/**
 * Turns one monster in a defense posture to attack (320 Stop Defense).
 *
 * Single-target: the original's text is "Forces **an** opponent's monster card
 * positioned for defense into the attack position", so the caster picks the
 * zone and `activateSpell` has already checked that it is occupied, on the
 * reachable side, and defending.
 *
 * `hasChangedPosition` is deliberately left untouched: it limits the owner's
 * own once-per-turn change, and a flip forced by another player's card is not
 * that play (`docs/spells/position-control.md` §3).
 */
function forceAttackPosition(state: DuelState, target: ZoneReference): ApplyResult {
  const zone = state.players[target.player].field.monsters[target.index];
  if (!zone.occupied) {
    throw new Error("Unreachable: activateSpell already validated the target zone.");
  }

  const revealed = isFaceDown(zone.position);
  const workingState = withMonsterZone(state, target.player, target.index, {
    ...zone,
    position: nextPosition(zone.position),
  });

  const events: DuelEvent[] = [];
  if (revealed) {
    events.push(
      createEvent({
        type: "onFlip",
        originPlayer: target.player,
        involvedCards: [zone.card],
        involvedZones: [target],
      }),
    );
  }
  events.push(
    createEvent({
      type: "onPositionChange",
      originPlayer: target.player,
      involvedCards: [zone.card],
      involvedZones: [target],
    }),
  );

  return { state: workingState, events };
}

/**
 * Turns every face-down monster the effect reaches face up, leaving the
 * attack/defense posture alone (350 Dark-piercing Light, and the first half of
 * 348 Swords of Revealing Light).
 *
 * That is why `revealPosition` exists next to `nextPosition`: revealing is not
 * a position change, so a defending monster stays defending. Only `onFlip` is
 * emitted, and only for a monster that really was hidden — a field with
 * nothing to reveal produces no events at all.
 */
function revealFaceDown(state: DuelState, targets: EffectTargets, caster: PlayerId): ApplyResult {
  let workingState = state;
  const events: DuelEvent[] = [];

  for (const player of playersForSide(targets.side, caster)) {
    for (const index of ZONE_INDEXES) {
      const zone = workingState.players[player].field.monsters[index];
      if (!zone.occupied || !matchesClassFilter(zone.card, targets.filter)) continue;
      if (!isFaceDown(zone.position)) continue;

      workingState = withMonsterZone(workingState, player, index, {
        ...zone,
        position: revealPosition(zone.position),
      });
      events.push(
        createEvent({
          type: "onFlip",
          originPlayer: player,
          involvedCards: [zone.card],
          involvedZones: [{ player, zoneType: "monster", index }],
        }),
      );
    }
  }

  return { state: workingState, events };
}

/**
 * Takes levels off every monster the effect reaches (349 Spellbinding Circle
 * for one, 669 Shadow Spell for two). Curses accumulate, so casting both
 * leaves a monster three levels down.
 *
 * Emits no event, exactly like `attack_lock`: the curse is state that the
 * combat providers read, and `EVENT_TYPES` stays closed at ten
 * (`docs/spells/README.md` §6).
 */
function applyStatCurse(
  state: DuelState,
  targets: EffectTargets,
  levels: number,
  caster: PlayerId,
): ApplyResult {
  let workingState = state;

  for (const player of playersForSide(targets.side, caster)) {
    for (const index of ZONE_INDEXES) {
      const zone = workingState.players[player].field.monsters[index];
      if (!zone.occupied || !matchesClassFilter(zone.card, targets.filter)) continue;

      workingState = withMonsterZone(workingState, player, index, {
        ...zone,
        curseLevels: (zone.curseLevels ?? 0) + levels,
      });
    }
  }

  return { state: workingState, events: [] };
}

/**
 * Clears every curse on the side the effect reaches — 655 Cursebreaker,
 * "sets them at level 0". Storing levels rather than an ATK delta is what
 * makes that one assignment.
 *
 * Equips are untouched: they are a different card on a different field, and
 * the original's text is about the curse only.
 */
function cleanseCurses(state: DuelState, side: EffectSide, caster: PlayerId): ApplyResult {
  let workingState = state;

  for (const player of playersForSide(side, caster)) {
    for (const index of ZONE_INDEXES) {
      const zone = workingState.players[player].field.monsters[index];
      if (!zone.occupied || (zone.curseLevels ?? 0) === 0) continue;

      workingState = withMonsterZone(workingState, player, index, { ...zone, curseLevels: 0 });
    }
  }

  return { state: workingState, events: [] };
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

/** One atomic effect, with the caster's chosen zone when the effect asks for one. */
function resolveAtomicEffect(
  state: DuelState,
  card: Card,
  effect: AtomicSpellEffect,
  caster: PlayerId,
  target: ZoneReference | undefined,
): ApplyResult {
  switch (effect.type) {
    case "destroy_monsters":
      return destroyMonsters(state, card, effect.targets, caster);
    case "destroy_spells":
      return destroySpells(state, card, effect.targets, caster);
    case "destroy_by_atk":
      return destroyMonstersByAtk(state, card, effect.targets, effect.minAtk, caster);
    case "force_attack_position":
      if (target === undefined) {
        throw new Error("Unreachable: activateSpell requires a target for this effect.");
      }
      return forceAttackPosition(state, target);
    case "reveal_face_down":
      return revealFaceDown(state, effect.targets, caster);
    case "stat_curse":
      return applyStatCurse(state, effect.targets, effect.levels, caster);
    case "cleanse_curses":
      return cleanseCurses(state, effect.side, caster);
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

/**
 * Resolves an immediate card effect into a new state plus the events it
 * emitted (`docs/spells/README.md` §5). Pure and total: it opens no reaction
 * window and never removes the card from the hand — `activateSpell` does both
 * around it.
 *
 * A `sequence` folds its parts left to right, each one seeing the state the
 * previous one produced, and concatenates their events in the same order. Only
 * 348 Swords of Revealing Light needs it — "Enemy monsters are revealed **and**
 * your opponent cannot attack for three turns".
 *
 * Every sweep iterates `P1` then `P2`, zone `0 → 4`, independently of the
 * caster, which is what makes the event order deterministic.
 */
export function resolveOneShotEffect(
  state: DuelState,
  card: Card,
  effect: SpellEffect,
  caster: PlayerId,
  target?: ZoneReference,
): ApplyResult {
  if (effect.type !== "sequence") {
    return resolveAtomicEffect(state, card, effect, caster, target);
  }

  let workingState = state;
  const events: DuelEvent[] = [];
  for (const step of effect.effects) {
    const resolved = resolveAtomicEffect(workingState, card, step, caster, target);
    workingState = resolved.state;
    events.push(...resolved.events);
  }

  return { state: workingState, events };
}
