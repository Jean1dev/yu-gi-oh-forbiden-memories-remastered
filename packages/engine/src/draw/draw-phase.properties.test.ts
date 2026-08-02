import {
  CARD_TYPES,
  GUARDIAN_STARS,
  type Card,
  type DuelState,
  type PlayerField,
  type PlayerState,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { drawUpToHandSize } from "./draw-phase.ts";

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
  tipo: fc.constantFrom(...CARD_TYPES),
});

function emptyField(): PlayerField {
  const zone = { occupied: false } as const;
  return { monsters: [zone, zone, zone, zone, zone], spells: [zone, zone, zone, zone, zone] };
}

function makeState(hand: readonly Card[], deck: readonly Card[]): DuelState {
  const active: PlayerState = { lp: 8000, hand, deck, field: emptyField(), handPlayUsed: false };
  const idle: PlayerState = { lp: 8000, hand: [], deck: [], field: emptyField(), handPlayUsed: false };
  return {
    players: { P1: active, P2: idle },
    activeField: null,
    activePlayer: "P1",
    turn: 1,
    phase: "draw",
    seed: 1,
  };
}

function sortedSerialized(cards: readonly Card[]): string[] {
  return cards.map((card) => JSON.stringify(card)).sort();
}

describe("drawUpToHandSize properties", () => {
  it("a mão nunca excede 5 e nunca inventa ou perde carta", () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { maxLength: 8 }),
        fc.array(cardArbitrary, { maxLength: 10 }),
        (hand, deck) => {
          const result = drawUpToHandSize(makeState(hand, deck));

          const needed = Math.max(0, 5 - hand.length);
          const expectedHandLength = hand.length + Math.min(needed, deck.length);
          expect(result.state.players.P1.hand.length).toBe(expectedHandLength);
          expect(
            sortedSerialized([...result.state.players.P1.hand, ...result.state.players.P1.deck]),
          ).toEqual(sortedSerialized([...hand, ...deck]));
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("determinismo: a mesma entrada produz sempre a mesma mão, deck, eventos e deckOutPlayer", () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { maxLength: 8 }),
        fc.array(cardArbitrary, { maxLength: 10 }),
        (hand, deck) => {
          const state = makeState(hand, deck);

          expect(drawUpToHandSize(state)).toEqual(drawUpToHandSize(state));
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("deck-out é monotônico: um deck menor que o necessário emite exatamente deck.length eventos e sempre marca deckOutPlayer", () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { maxLength: 4 }),
        fc.array(cardArbitrary, { maxLength: 4 }),
        (hand, deck) => {
          fc.pre(hand.length + deck.length < 5);

          const result = drawUpToHandSize(makeState(hand, deck));

          expect(result.events).toHaveLength(deck.length);
          expect(result.state.deckOutPlayer).toBe("P1");
        },
      ),
      { numRuns: 1000 },
    );
  });
});
