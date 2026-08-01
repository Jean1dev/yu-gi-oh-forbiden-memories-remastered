import type { Card, DuelState, PlayerField, PlayerState, ReactionWindow } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createEvent } from "../events/index.ts";
import { apply } from "./apply.ts";

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

function emptyField(): PlayerField {
  const zone = { occupied: false } as const;
  return {
    monsters: [zone, zone, zone, zone, zone],
    spells: [zone, zone, zone, zone, zone],
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
    turn: 1,
    phase: "draw",
    seed: 1,
    ...overrides,
  };
}

const openWindow: ReactionWindow = {
  type: "reaction_window",
  event: createEvent({ type: "onAttackDeclared", originPlayer: "P1" }),
  reactingPlayer: "P2",
};

describe("apply", () => {
  it("recusa advance_phase quando state.pending está definido, devolvendo code reaction_window_open", () => {
    const state = makeState({ pending: openWindow });

    const result = apply(state, { type: "advance_phase" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("reaction_window_open");
    }
  });

  it("não altera o estado quando recusa por janela de reação aberta", () => {
    const state = makeState({ pending: openWindow });

    apply(state, { type: "advance_phase" });

    expect(state.pending).toBe(openWindow);
    expect(state.phase).toBe("draw");
  });

  it("roteia advance_phase corretamente", () => {
    const state = makeState({ phase: "draw" });

    const result = apply(state, { type: "advance_phase" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.phase).toBe("main");
    }
  });

  it("roteia play_spell_or_trap para playSpellOrTrap", () => {
    const card = makeCard({ tipo: "magica" });
    const state = makeState({
      phase: "main",
      players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() },
    });

    const result = apply(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.spells[0]).toMatchObject({ occupied: true, card });
    }
  });

  it("roteia play_field_spell para playFieldSpell", () => {
    const card = makeCard({ tipo: "magica" });
    const state = makeState({
      phase: "main",
      players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() },
    });

    const result = apply(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.activeField).toEqual(card);
    }
  });

  it("recusa play_spell_or_trap quando state.pending está definido, devolvendo reaction_window_open", () => {
    const state = makeState({ phase: "main", pending: openWindow });

    const result = apply(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("reaction_window_open");
  });

  it("recusa play_field_spell quando state.pending está definido, devolvendo reaction_window_open", () => {
    const state = makeState({ phase: "main", pending: openWindow });

    const result = apply(state, { type: "play_field_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("reaction_window_open");
  });

  it("roteia change_position para changePosition e devolve o resultado de sucesso inalterado", () => {
    const monster = makeCard({ tipo: "monstro", classe: "Dragon" });
    const occupiedZone = {
      occupied: true as const,
      card: monster,
      position: "attack_face_up" as const,
      hasAttacked: false,
      hasChangedPosition: false,
    };
    const [, e1, e2, e3, e4] = emptyField().monsters;
    const state = makeState({
      phase: "battle",
      players: {
        P1: makePlayer({ field: { ...emptyField(), monsters: [occupiedZone, e1, e2, e3, e4] } }),
        P2: makePlayer(),
      },
    });

    const result = apply(state, { type: "change_position", zone: { player: "P1", zoneType: "monster", index: 0 } });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.monsters[0]).toMatchObject({
        position: "defense_face_up",
        hasChangedPosition: true,
      });
    }
  });

  it("devolve o erro de changePosition sem processamento adicional quando a mudança de posição é recusada", () => {
    const state = makeState({ phase: "battle" });

    const result = apply(state, { type: "change_position", zone: { player: "P1", zoneType: "monster", index: 0 } });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("zone_empty");
  });
});
