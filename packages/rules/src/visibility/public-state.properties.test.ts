import { DUEL_STAT_COUNTERS, type Card, type DuelStats, type DuelState, type PlayerField } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { getPublicDuelState } from "./public-state.ts";

/** Local zeroed counters — `rules` cannot import the engine's `emptyDuelStats`. */
function zeroStats(): DuelStats {
  return Object.fromEntries(DUEL_STAT_COUNTERS.map((counter) => [counter, 0])) as DuelStats;
}

const cardArbitrary: fc.Arbitrary<Card> = fc.integer({ min: 1, max: 722 }).map((id) => ({
  id,
  numero: String(id).padStart(3, "0"),
  nome: `Card ${id}`,
  img: null,
  classe: "Dragon",
  atk: id,
  def: id,
  guardiao1: null,
  guardiao2: null,
  password: null,
  estrelas: null,
  tipo: "monstro",
}));

const emptyField: PlayerField = {
  monsters: [
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
  ],
  spells: [
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
  ],
};

describe("public duel state properties", () => {
  it("preserves the viewer's hand order and never exposes either deck", () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { maxLength: 10 }),
        fc.array(cardArbitrary, { maxLength: 10 }),
        (hand, deck) => {
          const state: DuelState = {
            players: {
              P1: { lp: 8000, hand, deck, field: emptyField, handPlayUsed: false },
              P2: { lp: 8000, hand: deck, deck: hand, field: emptyField, handPlayUsed: false },
            },
            activeField: null,
            activePlayer: "P1",
            turn: 1,
            phase: "draw",
            seed: 42,
            stats: { P1: zeroStats(), P2: zeroStats() },
          };
          const result = getPublicDuelState(state, "P1");
          expect(result.players.P1.hand).toEqual({ visible: true, cards: hand });
          expect(result.players.P1.remainingDeck).toBe(deck.length);
          expect(result.players.P2.remainingDeck).toBe(hand.length);
          expect(JSON.stringify(result)).not.toContain('"deck"');
          expect(JSON.stringify(result)).not.toContain('"seed"');
        },
      ),
    );
  });
});
