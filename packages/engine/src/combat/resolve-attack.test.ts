import type { Card, DuelState, MonsterPosition, MonsterZone, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { declareAttack } from "./declare-attack.ts";
import { resolveAttack } from "./resolve-attack.ts";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Test Monster",
    img: null,
    classe: "Dragon",
    atk: 1500,
    def: 1200,
    guardiao1: "Sun",
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
    ...overrides,
  };
}

const emptyMonsterZone: MonsterZone = { occupied: false };

function occupiedZone(card: Card, position: MonsterPosition): MonsterZone {
  return { occupied: true, card, position, hasAttacked: false, hasChangedPosition: false };
}

function emptyField(): PlayerField {
  return {
    monsters: [emptyMonsterZone, emptyMonsterZone, emptyMonsterZone, emptyMonsterZone, emptyMonsterZone],
    spells: [
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
    ],
  };
}

function fieldWithMonster(card: Card, position: MonsterPosition): PlayerField {
  return { ...emptyField(), monsters: [occupiedZone(card, position), emptyMonsterZone, emptyMonsterZone, emptyMonsterZone, emptyMonsterZone] };
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
    phase: "battle",
    seed: 1,
    ...overrides,
  };
}

/** Declares an attack and returns the resulting pending state, asserting success. */
function declaredState(state: DuelState, targetZoneIndex?: 0 | 1 | 2 | 3 | 4): DuelState {
  const result = declareAttack(state, {
    type: "declare_attack",
    attackerZoneIndex: 0,
    ...(targetZoneIndex !== undefined ? { targetZoneIndex } : {}),
  });
  if (!result.ok) throw new Error(`Expected declareAttack to succeed, got ${result.error.code}`);
  return result.value.state;
}

describe("resolveAttack", () => {
  it("revela um defensor face-baixo antes de resolver e emite onFlip", () => {
    const attacker = makeCard({ numero: "001", atk: 1500 });
    const defender = makeCard({ numero: "002", atk: 1000, def: 800 });
    const declared = declaredState(
      makeState({
        players: {
          P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }),
          P2: makePlayer({ field: fieldWithMonster(defender, "defense_face_down") }),
        },
      }),
      0,
    );

    const result = resolveAttack(declared);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.events[0]).toMatchObject({ type: "onFlip" });
    }
  });

  it("não emite onFlip quando o defensor já estava face-cima", () => {
    const attacker = makeCard({ numero: "001", atk: 1500 });
    const defender = makeCard({ numero: "002", atk: 1000, def: 800 });
    const declared = declaredState(
      makeState({
        players: {
          P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }),
          P2: makePlayer({ field: fieldWithMonster(defender, "defense_face_up") }),
        },
      }),
      0,
    );

    const result = resolveAttack(declared);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.events.some((event) => event.type === "onFlip")).toBe(false);
    }
  });

  it("aplica dano ao dono do defensor quando o atacante vence", () => {
    const attacker = makeCard({ numero: "001", atk: 2000 });
    const defender = makeCard({ numero: "002", atk: 1000, def: 800 });
    const declared = declaredState(
      makeState({
        players: {
          P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }),
          P2: makePlayer({ field: fieldWithMonster(defender, "attack_face_up") }),
        },
      }),
      0,
    );

    const result = resolveAttack(declared);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P2.lp).toBe(8000 - 1000);
      expect(result.value.events).toContainEqual(
        expect.objectContaining({ type: "onDamage", context: { toPlayer: "P2", amount: 1000 } }),
      );
    }
  });

  it("aplica dano ao dono do atacante quando o defensor vence em defesa", () => {
    const attacker = makeCard({ numero: "001", atk: 1000 });
    const defender = makeCard({ numero: "002", atk: 500, def: 1800 });
    const declared = declaredState(
      makeState({
        players: {
          P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }),
          P2: makePlayer({ field: fieldWithMonster(defender, "defense_face_up") }),
        },
      }),
      0,
    );

    const result = resolveAttack(declared);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.lp).toBe(8000 - 800);
      expect(result.value.events).toContainEqual(
        expect.objectContaining({ type: "onDamage", context: { toPlayer: "P1", amount: 800 } }),
      );
    }
  });

  it("destrói o defensor e não aplica dano quando ATK supera DEF", () => {
    const attacker = makeCard({ numero: "001", atk: 2000 });
    const defender = makeCard({ numero: "002", atk: 500, def: 800 });
    const declared = declaredState(
      makeState({
        players: {
          P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }),
          P2: makePlayer({ field: fieldWithMonster(defender, "defense_face_up") }),
        },
      }),
      0,
    );

    const result = resolveAttack(declared);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P2.field.monsters[0]).toEqual({ occupied: false });
      expect(result.value.events.some((event) => event.type === "onDamage")).toBe(false);
      expect(result.value.events).toContainEqual(expect.objectContaining({ type: "onDestroy" }));
    }
  });

  it("destrói ambos os monstros sem dano no empate de ATK", () => {
    const attacker = makeCard({ numero: "001", atk: 1500 });
    const defender = makeCard({ numero: "002", atk: 1500, def: 800 });
    const declared = declaredState(
      makeState({
        players: {
          P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }),
          P2: makePlayer({ field: fieldWithMonster(defender, "attack_face_up") }),
        },
      }),
      0,
    );

    const result = resolveAttack(declared);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.monsters[0]).toEqual({ occupied: false });
      expect(result.value.state.players.P2.field.monsters[0]).toEqual({ occupied: false });
      expect(result.value.events.filter((event) => event.type === "onDestroy")).toHaveLength(2);
      expect(result.value.events.some((event) => event.type === "onDamage")).toBe(false);
    }
  });

  it("marca hasAttacked do atacante quando ele sobrevive", () => {
    const attacker = makeCard({ numero: "001", atk: 2000 });
    const declared = declaredState(
      makeState({ players: { P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }), P2: makePlayer() } }),
    );

    const result = resolveAttack(declared);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.monsters[0]).toMatchObject({ hasAttacked: true });
    }
  });

  it("remove a zona do atacante quando ele é destruído", () => {
    const attacker = makeCard({ numero: "001", atk: 500 });
    const defender = makeCard({ numero: "002", atk: 2000, def: 800 });
    const declared = declaredState(
      makeState({
        players: {
          P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }),
          P2: makePlayer({ field: fieldWithMonster(defender, "attack_face_up") }),
        },
      }),
      0,
    );

    const result = resolveAttack(declared);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.monsters[0]).toEqual({ occupied: false });
    }
  });

  it("fecha a janela de reação após resolver", () => {
    const attacker = makeCard({ numero: "001", atk: 1500 });
    const declared = declaredState(
      makeState({ players: { P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }), P2: makePlayer() } }),
    );

    const result = resolveAttack(declared);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.pending).toBeUndefined();
    }
  });

  it("recusa com no_pending_attack_to_resolve quando não há janela de ataque pendente", () => {
    const state = makeState();

    const result = resolveAttack(state);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("no_pending_attack_to_resolve");
  });

  it("aplicar resolveAttack duas vezes com o mesmo estado produz sempre o mesmo resultado", () => {
    const attacker = makeCard({ numero: "001", atk: 1500 });
    const declared = declaredState(
      makeState({ players: { P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }), P2: makePlayer() } }),
    );

    expect(resolveAttack(declared)).toEqual(resolveAttack(declared));
  });
});
