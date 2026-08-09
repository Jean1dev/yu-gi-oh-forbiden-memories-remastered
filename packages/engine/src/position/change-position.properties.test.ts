import {
  GUARDIAN_STARS,
  type Card,
  type DuelState,
  type MonsterPosition,
  type PlayerField,
  type PlayerState,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { replaceZone } from "../field/replace-zone.ts";
import { changePosition } from "./change-position.ts";
import { nextPosition } from "./next-position.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

const cardArbitrary = fc.record({
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
  tipo: fc.constant("monstro" as const),
});

const positionArbitrary = fc.constantFrom<MonsterPosition>(
  "attack_face_up",
  "attack_face_down",
  "defense_face_up",
  "defense_face_down",
);

function emptyField(): PlayerField {
  const monsterZone = { occupied: false } as const;
  const spellZone = { occupied: false } as const;
  return {
    monsters: [monsterZone, monsterZone, monsterZone, monsterZone, monsterZone],
    spells: [spellZone, spellZone, spellZone, spellZone, spellZone],
  };
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { lp: 8000, hand: [], deck: [], field: emptyField(), handPlayUsed: false, ...overrides };
}

function makeState(card: Card, position: MonsterPosition, zoneIndex: 0 | 1 | 2 | 3 | 4): DuelState {
  const targetZone = {
    occupied: true as const,
    card,
    position,
    hasAttacked: false,
    hasChangedPosition: false,
    equips: [],
  };
  const [e0, e1, e2, e3, e4] = emptyField().monsters;
  const pick = (index: number, empty: typeof e0) => (index === zoneIndex ? targetZone : empty);
  const monsters: PlayerField["monsters"] = [
    pick(0, e0),
    pick(1, e1),
    pick(2, e2),
    pick(3, e3),
    pick(4, e4),
  ];

  return {
    players: {
      P1: makePlayer({
        lp: 6000,
        hand: [card],
        deck: [card],
        field: { ...emptyField(), monsters },
      }),
      P2: makePlayer(),
    },
    activeField: card,
    activePlayer: "P1",
    turn: 5,
    phase: "battle",
    seed: 42,
    stats: emptyDuelStatsByPlayer(),
  };
}

const zoneIndexArbitrary = fc.constantFrom(
  0 as const,
  1 as const,
  2 as const,
  3 as const,
  4 as const,
);

describe("changePosition properties", () => {
  it("altera exclusivamente position e hasChangedPosition da zona-alvo, preservando o restante do estado", () => {
    fc.assert(
      fc.property(
        cardArbitrary,
        positionArbitrary,
        zoneIndexArbitrary,
        (card, position, zoneIndex) => {
          const state = makeState(card, position, zoneIndex);

          const result = changePosition(state, {
            player: "P1",
            zoneType: "monster",
            index: zoneIndex,
          });

          expect(result.ok).toBe(true);
          if (!result.ok) return;
          const { state: nextState } = result.value;

          expect(nextState.players.P1.lp).toBe(state.players.P1.lp);
          expect(nextState.players.P1.hand).toEqual(state.players.P1.hand);
          expect(nextState.players.P1.deck).toEqual(state.players.P1.deck);
          expect(nextState.players.P1.field.spells).toEqual(state.players.P1.field.spells);
          expect(nextState.players.P1.handPlayUsed).toBe(state.players.P1.handPlayUsed);
          expect(nextState.players.P2).toEqual(state.players.P2);
          expect(nextState.activeField).toEqual(state.activeField);
          expect(nextState.activePlayer).toBe(state.activePlayer);
          expect(nextState.turn).toBe(state.turn);
          expect(nextState.phase).toBe(state.phase);
          expect(nextState.seed).toBe(state.seed);

          for (const [index, zone] of nextState.players.P1.field.monsters.entries()) {
            if (index === zoneIndex) continue;
            expect(zone).toEqual(state.players.P1.field.monsters[index]);
          }

          const changedZone = nextState.players.P1.field.monsters[zoneIndex];
          expect(changedZone).toMatchObject({
            occupied: true,
            card,
            position: nextPosition(position),
            hasChangedPosition: true,
          });
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("convergência para face-cima: nextPosition nunca reintroduz uma posição face-baixo", () => {
    fc.assert(
      fc.property(positionArbitrary, (position) => {
        const result = nextPosition(position);
        expect(result === "attack_face_up" || result === "defense_face_up").toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("recusa determinística para monstro que já atacou: changePosition sempre falha com already_attacked", () => {
    fc.assert(
      fc.property(cardArbitrary, positionArbitrary, zoneIndexArbitrary, (card, position, zoneIndex) => {
        const state = makeState(card, position, zoneIndex);
        const targetZone = state.players.P1.field.monsters[zoneIndex];
        const attackedField = replaceZone(
          state.players.P1.field.monsters,
          zoneIndex,
          targetZone.occupied ? { ...targetZone, hasAttacked: true } : targetZone,
        );
        const attackedState: DuelState = {
          ...state,
          players: { ...state.players, P1: { ...state.players.P1, field: { ...state.players.P1.field, monsters: attackedField } } },
        };

        const result = changePosition(attackedState, { player: "P1", zoneType: "monster", index: zoneIndex });

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("already_attacked");
      }),
      { numRuns: 1000 },
    );
  });

  it("recusa determinística da 2ª troca: aplicar changePosition de novo sobre o mesmo estado resultante sempre falha", () => {
    fc.assert(
      fc.property(
        cardArbitrary,
        positionArbitrary,
        zoneIndexArbitrary,
        (card, position, zoneIndex) => {
          const state = makeState(card, position, zoneIndex);
          const zone = { player: "P1" as const, zoneType: "monster" as const, index: zoneIndex };

          const first = changePosition(state, zone);
          expect(first.ok).toBe(true);
          if (!first.ok) return;

          const second = changePosition(first.value.state, zone);
          expect(second.ok).toBe(false);
          if (!second.ok) expect(second.error.code).toBe("already_changed_position");
        },
      ),
      { numRuns: 1000 },
    );
  });
});
