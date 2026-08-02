import type { Card, DuelState, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { drawUpToHandSize, resolveDrawPhase } from "./draw-phase.ts";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Test Monster",
    img: null,
    classe: "Dragon",
    atk: 1000,
    def: 1000,
    guardiao1: "Sun",
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
    ...overrides,
  };
}

function emptyField(): PlayerField {
  const zone = { occupied: false } as const;
  return { monsters: [zone, zone, zone, zone, zone], spells: [zone, zone, zone, zone, zone] };
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { lp: 8000, hand: [], deck: [], field: emptyField(), handPlayUsed: false, ...overrides };
}

function makeState(overrides: Partial<DuelState> = {}): DuelState {
  return {
    players: { P1: makePlayer(), P2: makePlayer() },
    activeField: null,
    activePlayer: "P1",
    turn: 1,
    phase: "draw",
    seed: 1,
    ...overrides,
  };
}

describe("drawUpToHandSize", () => {
  it("completa a mão de 3 para 5 cartas puxando do topo do deck", () => {
    const hand = [makeCard({ numero: "001" }), makeCard({ numero: "002" }), makeCard({ numero: "003" })];
    const deck = [makeCard({ numero: "010" }), makeCard({ numero: "011" }), makeCard({ numero: "012" })];
    const state = makeState({ players: { P1: makePlayer({ hand, deck }), P2: makePlayer() } });

    const result = drawUpToHandSize(state);

    expect(result.state.players.P1.hand).toHaveLength(5);
  });

  it("não compra nenhuma carta quando a mão já tem 5", () => {
    const hand = [1, 2, 3, 4, 5].map((n) => makeCard({ numero: String(n).padStart(3, "0") }));
    const deck = [makeCard({ numero: "099" })];
    const state = makeState({ players: { P1: makePlayer({ hand, deck }), P2: makePlayer() } });

    const result = drawUpToHandSize(state);

    expect(result.state.players.P1.hand).toEqual(hand);
    expect(result.state.players.P1.deck).toEqual(deck);
    expect(result.events).toEqual([]);
  });

  it("compra 0 quando needed é 0 e a mão tem mais de 5 cartas", () => {
    const hand = [1, 2, 3, 4, 5, 6].map((n) => makeCard({ numero: String(n).padStart(3, "0") }));
    const deck = [makeCard({ numero: "099" })];
    const state = makeState({ players: { P1: makePlayer({ hand, deck }), P2: makePlayer() } });

    const result = drawUpToHandSize(state);

    expect(result.state.players.P1.hand).toEqual(hand);
    expect(result.events).toEqual([]);
  });

  it("emite um evento onDraw por carta puxada, na ordem do topo do deck", () => {
    const deck = [makeCard({ numero: "010" }), makeCard({ numero: "011" })];
    const state = makeState({ players: { P1: makePlayer({ hand: [], deck }), P2: makePlayer() } });

    const result = drawUpToHandSize(state);

    expect(result.events).toEqual([
      expect.objectContaining({
        type: "onDraw",
        originPlayer: "P1",
        involvedCards: [deck[0]],
      }),
      expect.objectContaining({
        type: "onDraw",
        originPlayer: "P1",
        involvedCards: [deck[1]],
      }),
    ]);
  });

  it("remove as cartas puxadas do deck e as acrescenta ao fim da mão", () => {
    const existingCard = makeCard({ numero: "001" });
    const drawnCard = makeCard({ numero: "010" });
    const state = makeState({
      players: { P1: makePlayer({ hand: [existingCard], deck: [drawnCard] }), P2: makePlayer() },
    });

    const result = drawUpToHandSize(state);

    expect(result.state.players.P1.hand).toEqual([existingCard, drawnCard]);
    expect(result.state.players.P1.deck).toEqual([]);
  });

  it("marca deckOutPlayer com o jogador ativo quando o deck esgota antes de completar 5", () => {
    const state = makeState({
      activePlayer: "P1",
      players: { P1: makePlayer({ hand: [], deck: [makeCard()] }), P2: makePlayer() },
    });

    const result = drawUpToHandSize(state);

    expect(result.state.deckOutPlayer).toBe("P1");
  });

  it("preserva as cartas já compradas com sucesso antes do deck esgotar", () => {
    const state = makeState({
      players: { P1: makePlayer({ hand: [], deck: [makeCard({ numero: "010" })] }), P2: makePlayer() },
    });

    const result = drawUpToHandSize(state);

    expect(result.state.players.P1.hand).toHaveLength(1);
  });

  it("não marca deckOutPlayer quando a compra é concluída sem esgotar o deck", () => {
    const deck = [1, 2, 3, 4, 5].map((n) => makeCard({ numero: String(n).padStart(3, "0") }));
    const state = makeState({ players: { P1: makePlayer({ hand: [], deck }), P2: makePlayer() } });

    const result = drawUpToHandSize(state);

    expect(result.state.deckOutPlayer).toBeUndefined();
  });
});

describe("resolveDrawPhase", () => {
  it("devolve erro com code draw_outside_draw_phase quando state.phase não é draw", () => {
    const state = makeState({ phase: "main" });

    const result = resolveDrawPhase(state);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("draw_outside_draw_phase");
    }
  });

  it("devolve o mesmo resultado de drawUpToHandSize quando state.phase é draw", () => {
    const state = makeState({
      phase: "draw",
      players: { P1: makePlayer({ hand: [], deck: [makeCard()] }), P2: makePlayer() },
    });

    const result = resolveDrawPhase(state);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(drawUpToHandSize(state));
    }
  });

  it("não altera o estado quando recusa por fase incorreta", () => {
    const state = makeState({ phase: "battle" });

    resolveDrawPhase(state);

    expect(state.phase).toBe("battle");
  });
});
