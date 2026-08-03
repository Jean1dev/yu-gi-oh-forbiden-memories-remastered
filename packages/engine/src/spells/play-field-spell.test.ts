import type { Card, DuelState, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { playFieldSpell } from "./play-field-spell.ts";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "334",
    nome: "Umi",
    img: null,
    classe: "Magic",
    atk: null,
    def: null,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "magica",
    ...overrides,
  };
}

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

function makeState(overrides: Partial<DuelState> = {}): DuelState {
  return {
    players: { P1: makePlayer(), P2: makePlayer() },
    activeField: null,
    activePlayer: "P1",
    turn: 3,
    phase: "main",
    seed: 1,
    ...overrides,
  };
}

describe("playFieldSpell — success", () => {
  it("substitui o terreno ativo pela carta jogada", () => {
    const card = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.activeField).toEqual(card);
    }
  });

  it("substitui um terreno já ativo sem emitir nenhum evento sobre o terreno anterior", () => {
    const previousField = makeCard({ numero: "331", nome: "Wasteland" });
    const nextField = makeCard({ numero: "330", nome: "Forest" });
    const state = makeState({
      activeField: previousField,
      players: { P1: makePlayer({ hand: [nextField] }), P2: makePlayer() },
    });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.activeField).toEqual(nextField);
      expect(result.value.events).toHaveLength(1);
      expect(result.value.events[0]?.type).toBe("onSet");
    }
  });

  it("remove a carta da mão", () => {
    const card = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.hand).toEqual([]);
    }
  });

  it("marca a jogada da mão como usada", () => {
    const card = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.handPlayUsed).toBe(true);
    }
  });

  it("emite onSet com involvedZones vazio e context.target igual a field", () => {
    const card = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.events).toEqual([
        expect.objectContaining({
          type: "onSet",
          originPlayer: "P1",
          involvedCards: [card],
          involvedZones: [],
          context: { target: "field" },
        }),
      ]);
    }
  });

  it("abre janela de reação com o oponente do jogador ativo podendo reagir", () => {
    const card = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.pending).toMatchObject({
        type: "reaction_window",
        reactingPlayer: "P2",
      });
    }
  });
});

describe("playFieldSpell — rejections", () => {
  it("recusa com hand_play_already_used quando a jogada da mão já foi usada", () => {
    const card = makeCard();
    const state = makeState({
      players: { P1: makePlayer({ hand: [card], handPlayUsed: true }), P2: makePlayer() },
    });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("hand_play_already_used");
  });

  it("recusa com card_unavailable quando o handIndex não corresponde a nenhuma carta", () => {
    const state = makeState({ players: { P1: makePlayer({ hand: [] }), P2: makePlayer() } });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("card_unavailable");
  });

  it("recusa com invalid_field_spell_card_type para uma carta do tipo armadilha", () => {
    const card = makeCard({ tipo: "armadilha", classe: "Trap" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_field_spell_card_type");
  });

  it("recusa com invalid_field_spell_card_type para uma carta do tipo monstro", () => {
    const card = makeCard({ tipo: "monstro", classe: "Dragon" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_field_spell_card_type");
  });

  it("não altera o estado em nenhum dos casos de recusa", () => {
    const card = makeCard({ tipo: "monstro", classe: "Dragon" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    expect(state).toEqual(snapshot);
  });
});

describe("playFieldSpell - effect table routing", () => {
  it.each(["330", "331", "332", "333", "334", "335"])(
    "accepts terrain card %s",
    (numero) => {
      const card = makeCard({ numero });
      const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

      expect(playFieldSpell(state, { type: "play_field_spell", handIndex: 0 }).ok).toBe(true);
    },
  );

  it("rejects Raigeki even though it is a Magic card", () => {
    const card = makeCard({ numero: "337", nome: "Raigeki" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playFieldSpell(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_field_spell_card_type");
  });
});
