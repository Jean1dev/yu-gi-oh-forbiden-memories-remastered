import {
  DUEL_STAT_COUNTERS,
  INITIAL_LP,
  type Card,
  type CardNumber,
  type InitializationInput,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createMulberry32 } from "../prng/mulberry32.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";
import { initDuel } from "./init-duel.ts";

function makeCard(cardNumber: CardNumber): Card {
  return {
    id: Number(cardNumber),
    numero: cardNumber,
    nome: `Card ${cardNumber}`,
    img: null,
    classe: "Warrior",
    atk: 1000,
    def: 1000,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

function cardList(count: number, prefix: string): readonly Card[] {
  return Array.from({ length: count }, (_, i) => makeCard(`${prefix}${String(i).padStart(3, "0")}`));
}

function inputWith(overrides: Partial<{ p1: readonly Card[]; p2: readonly Card[]; seed: number }> = {}) {
  const p1 = overrides.p1 ?? cardList(40, "1");
  const p2 = overrides.p2 ?? cardList(40, "2");
  const seed = overrides.seed ?? 1753617600;
  const input: InitializationInput = { players: { P1: { cards: p1 }, P2: { cards: p2 } }, seed };
  return input;
}

describe("initDuel", () => {
  it("deals exactly 5 cards to hand and 35 to deck for each player", () => {
    const state = initDuel(inputWith());

    expect(state.players.P1.hand).toHaveLength(5);
    expect(state.players.P1.deck).toHaveLength(35);
    expect(state.players.P2.hand).toHaveLength(5);
    expect(state.players.P2.deck).toHaveLength(35);
  });

  it("starts both players at 8000 LP", () => {
    const state = initDuel(inputWith());

    expect(state.players.P1.lp).toBe(INITIAL_LP);
    expect(state.players.P2.lp).toBe(INITIAL_LP);
  });

  it("starts the field with all 10 zones empty for each side", () => {
    const state = initDuel(inputWith());

    for (const player of ["P1", "P2"] as const) {
      for (const zone of state.players[player].field.monsters) {
        expect(zone.occupied).toBe(false);
      }
      for (const zone of state.players[player].field.spells) {
        expect(zone.occupied).toBe(false);
      }
    }
  });

  it("starts without an active field spell", () => {
    const state = initDuel(inputWith());

    expect(state.activeField).toBeNull();
  });

  it("starts at turn 1, draw phase", () => {
    const state = initDuel(inputWith());

    expect(state.turn).toBe(1);
    expect(state.phase).toBe("draw");
  });

  it("starts without a pending reaction window", () => {
    const state = initDuel(inputWith());

    expect(state.pending).toBeUndefined();
  });

  it("starts both players with zeroed stats", () => {
    const state = initDuel(inputWith());

    expect(state.stats).toEqual(emptyDuelStatsByPlayer());
    for (const counter of DUEL_STAT_COUNTERS) {
      expect(state.stats.P1[counter]).toBe(0);
      expect(state.stats.P2[counter]).toBe(0);
    }
  });

  it("preserves the received seed in the resulting state", () => {
    const state = initDuel(inputWith({ seed: 424242 }));

    expect(state.seed).toBe(424242);
  });

  it("shuffles P1 before P2 and draws the first player last", () => {
    // Asymmetric deck sizes so the number of PRNG calls each shuffle
    // consumes differs (Fisher-Yates on n elements makes n-1 calls) — if the
    // implementation swapped the order, the first-player draw below would
    // land on a different intermediate PRNG state and this test would fail.
    const p1 = cardList(2, "1");
    const p2 = cardList(4, "2");
    const seed = 12345;
    const input = inputWith({ p1, p2, seed });

    const reference = createMulberry32(seed);
    const fisherYatesCalls = (n: number) => Math.max(n - 1, 0);
    for (let i = 0; i < fisherYatesCalls(p1.length); i++) reference();
    for (let i = 0; i < fisherYatesCalls(p2.length); i++) reference();
    const expectedFirstPlayer = reference() < 0.5 ? "P1" : "P2";

    const state = initDuel(input);

    expect(state.activePlayer).toBe(expectedFirstPlayer);
  });
});
