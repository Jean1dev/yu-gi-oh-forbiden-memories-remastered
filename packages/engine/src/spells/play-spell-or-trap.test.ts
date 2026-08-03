import type { Card, DuelState, PlayerField, PlayerState, SpellZone } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { playSpellOrTrap } from "./play-spell-or-trap.ts";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "030",
    nome: "Test Spell",
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

const emptySpellZone: SpellZone = { occupied: false };

function occupiedSpellZone(overrides: Partial<Extract<SpellZone, { occupied: true }>> = {}): SpellZone {
  return { occupied: true, card: makeCard({ numero: "999" }), faceUp: true, ...overrides };
}

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

describe("playSpellOrTrap — success", () => {
  it("coloca uma armadilha face-baixo na zona escolhida e remove a carta da mão", () => {
    const card = makeCard({ tipo: "armadilha" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players.P1.field.spells[1]).toMatchObject({
      occupied: true,
      card,
      faceUp: false,
    });
    expect(result.value.state.players.P1.hand).toEqual([]);
  });

  it("coloca uma magia de efeito face-cima na zona escolhida", () => {
    const card = makeCard({ tipo: "magica" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.spells[0]).toMatchObject({ faceUp: true });
    }
  });

  it("coloca um equipamento face-cima na zona escolhida", () => {
    const card = makeCard({ tipo: "equipamento" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.spells[0]).toMatchObject({ faceUp: true });
    }
  });

  it("marca a jogada da mão como usada após posicionar a carta", () => {
    const card = makeCard({ tipo: "magica" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.handPlayUsed).toBe(true);
    }
  });

  it("emite onSet com a carta e a zona envolvidas, e context.target igual a spell_trap_zone", () => {
    const card = makeCard({ tipo: "armadilha" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 3 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.events).toEqual([
        expect.objectContaining({
          type: "onSet",
          originPlayer: "P1",
          involvedCards: [card],
          involvedZones: [{ player: "P1", zoneType: "spell", index: 3 }],
          context: { target: "spell_trap_zone", faceUp: false },
        }),
      ]);
    }
  });

  it("abre janela de reação com o oponente do jogador ativo podendo reagir", () => {
    const card = makeCard({ tipo: "magica" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.pending).toMatchObject({
        type: "reaction_window",
        reactingPlayer: "P2",
      });
    }
  });
});

describe("playSpellOrTrap — rejections", () => {
  it("recusa com hand_play_already_used quando a jogada da mão já foi usada", () => {
    const card = makeCard({ tipo: "magica" });
    const state = makeState({
      players: { P1: makePlayer({ hand: [card], handPlayUsed: true }), P2: makePlayer() },
    });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("hand_play_already_used");
  });

  it("recusa com card_unavailable quando o handIndex não corresponde a nenhuma carta", () => {
    const state = makeState({ players: { P1: makePlayer({ hand: [] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("card_unavailable");
  });

  it("recusa com invalid_spell_trap_card_type para uma carta do tipo monstro", () => {
    const card = makeCard({ tipo: "monstro" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_spell_trap_card_type");
  });

  it("recusa com invalid_spell_trap_card_type para uma carta do tipo ritual", () => {
    const card = makeCard({ tipo: "ritual" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_spell_trap_card_type");
  });

  it("recusa com zone_occupied quando a zona escolhida está ocupada e outras estão livres", () => {
    const card = makeCard({ tipo: "magica" });
    const state = makeState({
      players: {
        P1: makePlayer({
          hand: [card],
          field: { ...emptyField(), spells: [occupiedSpellZone(), emptySpellZone, emptySpellZone, emptySpellZone, emptySpellZone] },
        }),
        P2: makePlayer(),
      },
    });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("zone_occupied");
  });

  it("recusa com no_space_for_card quando todas as 5 zonas estão ocupadas", () => {
    const card = makeCard({ tipo: "magica" });
    const state = makeState({
      players: {
        P1: makePlayer({
          hand: [card],
          field: {
            ...emptyField(),
            spells: [occupiedSpellZone(), occupiedSpellZone(), occupiedSpellZone(), occupiedSpellZone(), occupiedSpellZone()],
          },
        }),
        P2: makePlayer(),
      },
    });

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("no_space_for_card");
  });

  it("não altera o estado em nenhum dos casos de recusa", () => {
    const card = makeCard({ tipo: "monstro" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = playSpellOrTrap(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(false);
    expect(state).toEqual(snapshot);
  });
});

describe("playSpellOrTrap — cartas que pertencem a outra acao", () => {
  const misroutes: readonly { name: string; card: Card; code: string }[] = [
    {
      name: "recusa Legendary Sword com equip_requires_target",
      card: makeCard({ numero: "301", nome: "Legendary Sword", classe: "Equip", tipo: "equipamento" }),
      code: "equip_requires_target",
    },
    {
      name: "recusa Forest com terrain_requires_field_zone",
      card: makeCard({ numero: "330", nome: "Forest" }),
      code: "terrain_requires_field_zone",
    },
    {
      name: "recusa Raigeki com spell_requires_activation",
      card: makeCard({ numero: "337", nome: "Raigeki" }),
      code: "spell_requires_activation",
    },
    {
      name: "recusa Sword of Dark Destruction com spell_requires_activation, apesar de ser equipamento",
      card: makeCard({ numero: "302", classe: "Equip", tipo: "equipamento" }),
      code: "spell_requires_activation",
    },
  ];

  for (const { name, card, code } of misroutes) {
    it(name, () => {
      const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

      const result = playSpellOrTrap(state, {
        type: "play_spell_or_trap",
        handIndex: 0,
        zoneIndex: 0,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe(code);
      expect(state.players.P1.field.spells[0].occupied).toBe(false);
    });
  }

  it("continua posicionando uma carta de magia sem entrada na tabela de efeitos", () => {
    const inert = makeCard({ numero: "030" });
    const state = makeState({ players: { P1: makePlayer({ hand: [inert] }), P2: makePlayer() } });

    const result = playSpellOrTrap(state, {
      type: "play_spell_or_trap",
      handIndex: 0,
      zoneIndex: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players.P1.field.spells[0]).toEqual({
      occupied: true,
      card: inert,
      faceUp: true,
    });
  });
});
