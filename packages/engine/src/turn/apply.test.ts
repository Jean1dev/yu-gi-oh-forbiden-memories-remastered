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
      equips: [],
    };
    const [, e1, e2, e3, e4] = emptyField().monsters;
    const state = makeState({
      phase: "battle",
      players: {
        P1: makePlayer({ field: { ...emptyField(), monsters: [occupiedZone, e1, e2, e3, e4] } }),
        P2: makePlayer(),
      },
    });

    const result = apply(state, {
      type: "change_position",
      zone: { player: "P1", zoneType: "monster", index: 0 },
    });

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

    const result = apply(state, {
      type: "change_position",
      zone: { player: "P1", zoneType: "monster", index: 0 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("zone_empty");
  });

  it("roteia declare_attack para declareAttack", () => {
    const monster = makeCard({ tipo: "monstro", classe: "Dragon", atk: 1500, def: 1200 });
    const occupiedZone = {
      occupied: true as const,
      card: monster,
      position: "attack_face_up" as const,
      hasAttacked: false,
      hasChangedPosition: false,
      equips: [],
    };
    const [, e1, e2, e3, e4] = emptyField().monsters;
    const state = makeState({
      turn: 3,
      phase: "battle",
      players: {
        P1: makePlayer({ field: { ...emptyField(), monsters: [occupiedZone, e1, e2, e3, e4] } }),
        P2: makePlayer(),
      },
    });

    const result = apply(state, { type: "declare_attack", attackerZoneIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.events).toEqual([expect.objectContaining({ type: "onAttackDeclared" })]);
      expect(result.value.state.pending).toMatchObject({
        type: "reaction_window",
        reactingPlayer: "P2",
      });
    }
  });

  it("roteia resolve_attack para resolveAttack quando há janela de onAttackDeclared pendente", () => {
    const monster = makeCard({ tipo: "monstro", classe: "Dragon", atk: 1500, def: 1200 });
    const occupiedZone = {
      occupied: true as const,
      card: monster,
      position: "attack_face_up" as const,
      hasAttacked: false,
      hasChangedPosition: false,
      equips: [],
    };
    const [, e1, e2, e3, e4] = emptyField().monsters;
    const state = makeState({
      turn: 3,
      phase: "battle",
      players: {
        P1: makePlayer({ field: { ...emptyField(), monsters: [occupiedZone, e1, e2, e3, e4] } }),
        P2: makePlayer(),
      },
    });
    const declared = apply(state, { type: "declare_attack", attackerZoneIndex: 0 });
    if (!declared.ok) throw new Error("Expected declare_attack to succeed");

    const result = apply(declared.value.state, { type: "resolve_attack" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.pending).toBeUndefined();
      expect(result.value.state.players.P2.lp).toBe(8000 - 1500);
    }
  });

  it("recusa resolve_attack com no_pending_attack_to_resolve quando não há janela de ataque pendente", () => {
    const state = makeState({ phase: "battle" });

    const result = apply(state, { type: "resolve_attack" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("no_pending_attack_to_resolve");
  });

  it("routes surrender to the surrender handler", () => {
    const result = apply(makeState({ phase: "main" }), { type: "surrender", player: "P1" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.outcome).toEqual({
      status: "decisive",
      winner: "P2",
      loser: "P1",
      reason: "surrender",
    });
  });

  it("accepts surrender from the inactive player even with an open reaction window", () => {
    const state = makeState({ phase: "battle", pending: openWindow });

    const result = apply(state, { type: "surrender", player: "P2" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.state.outcome).toMatchObject({ reason: "surrender" });
  });

  it.each([
    { type: "advance_phase" },
    { type: "change_position", zone: { player: "P1", zoneType: "monster", index: 0 } },
    { type: "declare_attack", attackerZoneIndex: 0 },
    { type: "resolve_attack" },
    { type: "surrender", player: "P1" },
  ] as const)("refuses $type with duel_already_ended after the duel ends", (action) => {
    const state = makeState({
      outcome: { status: "decisive", winner: "P1", loser: "P2", reason: "lp_depleted" },
    });

    const result = apply(state, action);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("duel_already_ended");
  });

  it("stamps lp_depleted on the state returned by a lethal resolve_attack", () => {
    const monster = makeCard({ tipo: "monstro", classe: "Dragon", atk: 1500, def: 1200 });
    const occupiedZone = {
      occupied: true as const,
      card: monster,
      position: "attack_face_up" as const,
      hasAttacked: false,
      hasChangedPosition: false,
      equips: [],
    };
    const [, e1, e2, e3, e4] = emptyField().monsters;
    const state = makeState({
      turn: 3,
      phase: "battle",
      players: {
        P1: makePlayer({ field: { ...emptyField(), monsters: [occupiedZone, e1, e2, e3, e4] } }),
        P2: makePlayer({ lp: 1500 }),
      },
    });
    const declared = apply(state, { type: "declare_attack", attackerZoneIndex: 0 });
    if (!declared.ok) throw new Error("Expected declare_attack to succeed");

    const result = apply(declared.value.state, { type: "resolve_attack" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players.P2.lp).toBe(0);
    expect(result.value.state.outcome).toEqual({
      status: "decisive",
      winner: "P1",
      loser: "P2",
      reason: "lp_depleted",
    });
  });

  it("stamps deck_out on the advance_phase that cannot complete the draw", () => {
    const state = makeState({ phase: "draw", players: { P1: makePlayer(), P2: makePlayer() } });

    const result = apply(state, { type: "advance_phase" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.outcome).toEqual({
      status: "decisive",
      winner: "P2",
      loser: "P1",
      reason: "deck_out",
    });
  });

  it("does not stamp an outcome while no ending condition holds", () => {
    const result = apply(makeState({ phase: "main" }), { type: "advance_phase" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.state.outcome).toBeUndefined();
  });
});
