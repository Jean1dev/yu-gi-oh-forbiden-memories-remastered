import {
  GUARDIAN_STARS,
  spellPlayMode,
  type Card,
  type DuelState,
  type PlayerField,
  type PlayerState,
  type SpellZone,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { playFieldSpell } from "./play-field-spell.ts";
import { playSpellOrTrap } from "./play-spell-or-trap.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

const baseCardArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  numero: fc.integer({ min: 1, max: 999 }).map((n) => String(n).padStart(3, "0")),
  nome: fc.string({ minLength: 1, maxLength: 20 }),
  img: fc.constant(null),
  atk: fc.option(fc.integer({ min: 0, max: 9999 }), { nil: null }),
  def: fc.option(fc.integer({ min: 0, max: 9999 }), { nil: null }),
  guardiao1: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  guardiao2: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  password: fc.constant(null),
  estrelas: fc.option(fc.integer({ min: 0, max: 12 }), { nil: null }),
});

const spellTrapCardArbitrary = fc
  .tuple(
    baseCardArbitrary,
    fc.constantFrom("armadilha" as const, "equipamento" as const, "magica" as const),
  )
  .map(([base, tipo]) => ({ ...base, classe: tipo === "magica" ? "Magic" : "Other", tipo }))
  .filter((card) => spellPlayMode(card) === "place");

const activeFieldCardArbitrary = baseCardArbitrary.map((base) => ({
  ...base,
  classe: "Magic",
  tipo: "magica" as const,
}));

const fieldSpellCardArbitrary = fc
  .tuple(baseCardArbitrary, fc.constantFrom("330", "331", "332", "333", "334", "335"))
  .map(([base, numero]) => ({
    ...base,
    numero,
    classe: "Magic",
    tipo: "magica" as const,
  }));

const emptySpellZone: SpellZone = { occupied: false };

function emptyField(): PlayerField {
  const monsterZone = { occupied: false } as const;
  return {
    monsters: [monsterZone, monsterZone, monsterZone, monsterZone, monsterZone],
    spells: [emptySpellZone, emptySpellZone, emptySpellZone, emptySpellZone, emptySpellZone],
  };
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { lp: 8000, hand: [], deck: [], field: emptyField(), handPlayUsed: false, ...overrides };
}

function makeState(hand: readonly Card[], deck: readonly Card[], activeField: Card | null): DuelState {
  return {
    players: { P1: makePlayer({ hand, deck }), P2: makePlayer() },
    activeField,
    activePlayer: "P1",
    turn: 3,
    phase: "main",
    seed: 1,
    stats: emptyDuelStatsByPlayer(),
  };
}

describe("playSpellOrTrap properties", () => {
  it("determinismo: a mesma entrada produz sempre o mesmo ApplyResult", () => {
    fc.assert(
      fc.property(
        spellTrapCardArbitrary,
        fc.array(baseCardArbitrary.map((c) => ({ ...c, classe: "Other", tipo: "monstro" as const })), { maxLength: 5 }),
        fc.constantFrom(0, 1, 2, 3, 4),
        (card, deck, zoneIndex) => {
          const state = makeState([card], deck, null);
          const action = { type: "play_spell_or_trap" as const, handIndex: 0, zoneIndex };

          expect(playSpellOrTrap(state, action)).toEqual(playSpellOrTrap(state, action));
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("preserva lp, deck, activeField e o atk/def base da carta colocada", () => {
    fc.assert(
      fc.property(
        spellTrapCardArbitrary,
        fc.array(baseCardArbitrary.map((c) => ({ ...c, classe: "Other", tipo: "monstro" as const })), { maxLength: 5 }),
        fc.constantFrom(0, 1, 2, 3, 4),
        activeFieldCardArbitrary,
        (card, deck, zoneIndex, currentField) => {
          const state = makeState([card], deck, currentField);

          const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex });

          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(result.value.state.players.P1.lp).toBe(8000);
          expect(result.value.state.players.P1.deck).toEqual(deck);
          expect(result.value.state.activeField).toEqual(currentField);
          const zone = result.value.state.players.P1.field.spells[zoneIndex];
          expect(zone?.occupied && zone.card.atk).toBe(card.atk);
          expect(zone?.occupied && zone.card.def).toBe(card.def);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("playFieldSpell properties", () => {
  it("determinismo: a mesma entrada produz sempre o mesmo ApplyResult", () => {
    fc.assert(
      fc.property(fieldSpellCardArbitrary, (card) => {
        const state = makeState([card], [], null);
        const action = { type: "play_field_spell" as const, handIndex: 0 };

        expect(playFieldSpell(state, action)).toEqual(playFieldSpell(state, action));
      }),
      { numRuns: 1000 },
    );
  });

  it("preserva lp, deck, o restante do field e o atk/def base da carta jogada", () => {
    fc.assert(
      fc.property(
        fieldSpellCardArbitrary,
        fc.array(baseCardArbitrary.map((c) => ({ ...c, classe: "Other", tipo: "monstro" as const })), { maxLength: 5 }),
        (card, deck) => {
          const state = makeState([card], deck, null);

          const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(result.value.state.players.P1.lp).toBe(8000);
          expect(result.value.state.players.P1.deck).toEqual(deck);
          expect(result.value.state.players.P1.field).toEqual(emptyField());
          expect(result.value.state.activeField?.atk).toBe(card.atk);
          expect(result.value.state.activeField?.def).toBe(card.def);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
