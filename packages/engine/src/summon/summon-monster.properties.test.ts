import {
  GUARDIAN_STARS,
  type Card,
  type DuelState,
  type MonsterZone,
  type PlayerField,
  type PlayerState,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { summonMonster } from "./summon-monster.ts";

const summonableCardArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  numero: fc.integer({ min: 1, max: 999 }).map((n) => String(n).padStart(3, "0")),
  nome: fc.string({ minLength: 1, maxLength: 20 }),
  img: fc.constant(null),
  classe: fc.string({ minLength: 1, maxLength: 20 }),
  atk: fc.option(fc.integer({ min: 0, max: 9999 }), { nil: null }),
  def: fc.option(fc.integer({ min: 0, max: 9999 }), { nil: null }),
  guardiao1: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  guardiao2: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  password: fc.constant(null),
  estrelas: fc.option(fc.integer({ min: 0, max: 12 }), { nil: null }),
  tipo: fc.constantFrom("monstro" as const, "ritual" as const),
});

const positionArbitrary = fc.constantFrom(
  "attack_face_up" as const,
  "attack_face_down" as const,
  "defense_face_up" as const,
  "defense_face_down" as const,
);

function makeField(occupiedFlags: readonly boolean[], filler: Card): PlayerField {
  const zoneFor = (occupied: boolean): MonsterZone =>
    occupied
      ? { occupied: true, card: filler, position: "attack_face_up", hasAttacked: false, hasChangedPosition: false }
      : { occupied: false };
  const [f0, f1, f2, f3, f4] = occupiedFlags;
  return {
    monsters: [
      zoneFor(f0 ?? false),
      zoneFor(f1 ?? false),
      zoneFor(f2 ?? false),
      zoneFor(f3 ?? false),
      zoneFor(f4 ?? false),
    ],
    spells: [
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
    ],
  };
}

function makeState(hand: readonly Card[], occupiedFlags: readonly boolean[], filler: Card): DuelState {
  const active: PlayerState = {
    lp: 8000,
    hand,
    deck: [],
    field: makeField(occupiedFlags, filler),
    handPlayUsed: false,
  };
  const idle: PlayerState = {
    lp: 8000,
    hand: [],
    deck: [],
    field: makeField([false, false, false, false, false], filler),
    handPlayUsed: false,
  };
  return {
    players: { P1: active, P2: idle },
    activeField: null,
    activePlayer: "P1",
    turn: 3,
    phase: "main",
    seed: 1,
  };
}

const scenarioArbitrary = fc
  .record({
    hand: fc.array(summonableCardArbitrary, { minLength: 1, maxLength: 5 }),
    occupiedFlags: fc
      .array(fc.boolean(), { minLength: 5, maxLength: 5 })
      .filter((flags) => flags.some((occupied) => !occupied)),
    fillerCard: summonableCardArbitrary,
    position: positionArbitrary,
  })
  .chain(({ hand, occupiedFlags, fillerCard, position }) => {
    const freeIndexes = occupiedFlags.flatMap((occupied, index) => (occupied ? [] : [index]));
    return fc.record({
      hand: fc.constant(hand),
      occupiedFlags: fc.constant(occupiedFlags),
      fillerCard: fc.constant(fillerCard),
      position: fc.constant(position),
      handIndex: fc.integer({ min: 0, max: hand.length - 1 }),
      zoneIndex: fc.constantFrom(...freeIndexes),
    });
  });

describe("summonMonster properties", () => {
  it("a mão perde exatamente 1 carta e o campo ganha exatamente 1 zona ocupada a mais", () => {
    fc.assert(
      fc.property(scenarioArbitrary, ({ hand, occupiedFlags, fillerCard, handIndex, zoneIndex, position }) => {
        const state = makeState(hand, occupiedFlags, fillerCard);
        const occupiedBefore = occupiedFlags.filter(Boolean).length;

        const result = summonMonster(state, {
          type: "summon_monster",
          player: "P1",
          handIndex,
          zoneIndex: zoneIndex as 0 | 1 | 2 | 3 | 4,
          position,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.state.players.P1.hand.length).toBe(hand.length - 1);
        const occupiedAfter = result.value.state.players.P1.field.monsters.filter(
          (zone) => zone.occupied,
        ).length;
        expect(occupiedAfter).toBe(occupiedBefore + 1);
      }),
      { numRuns: 1000 },
    );
  });

  it("preserva atk/def base da carta movida", () => {
    fc.assert(
      fc.property(scenarioArbitrary, ({ hand, occupiedFlags, fillerCard, handIndex, zoneIndex, position }) => {
        const state = makeState(hand, occupiedFlags, fillerCard);
        const card = hand[handIndex];
        if (card === undefined) return;

        const result = summonMonster(state, {
          type: "summon_monster",
          player: "P1",
          handIndex,
          zoneIndex: zoneIndex as 0 | 1 | 2 | 3 | 4,
          position,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const zone = result.value.state.players.P1.field.monsters[zoneIndex];
        expect(zone?.occupied && zone.card.atk).toBe(card.atk);
        expect(zone?.occupied && zone.card.def).toBe(card.def);
      }),
      { numRuns: 1000 },
    );
  });

  it("determinismo: a mesma entrada produz sempre o mesmo ApplyResult", () => {
    fc.assert(
      fc.property(scenarioArbitrary, ({ hand, occupiedFlags, fillerCard, handIndex, zoneIndex, position }) => {
        const state = makeState(hand, occupiedFlags, fillerCard);
        const action = {
          type: "summon_monster" as const,
          player: "P1" as const,
          handIndex,
          zoneIndex: zoneIndex as 0 | 1 | 2 | 3 | 4,
          position,
        };

        expect(summonMonster(state, action)).toEqual(summonMonster(state, action));
      }),
      { numRuns: 1000 },
    );
  });
});
