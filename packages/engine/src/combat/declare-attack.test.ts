import type {
  Card,
  DuelState,
  MonsterPosition,
  MonsterZone,
  PlayerField,
  PlayerState,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { declareAttack } from "./declare-attack.ts";

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

function occupiedZone(
  position: MonsterPosition,
  overrides: Partial<Extract<MonsterZone, { occupied: true }>> = {},
): MonsterZone {
  return {
    occupied: true,
    card: makeCard(),
    position,
    hasAttacked: false,
    hasChangedPosition: false,
    equips: [],
    ...overrides,
  };
}

function emptyField(): PlayerField {
  return {
    monsters: [
      emptyMonsterZone,
      emptyMonsterZone,
      emptyMonsterZone,
      emptyMonsterZone,
      emptyMonsterZone,
    ],
    spells: [
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
    ],
  };
}

function fieldWithAttacker(
  position: MonsterPosition,
  overrides: Partial<Extract<MonsterZone, { occupied: true }>> = {},
): PlayerField {
  return {
    ...emptyField(),
    monsters: [
      occupiedZone(position, overrides),
      emptyMonsterZone,
      emptyMonsterZone,
      emptyMonsterZone,
      emptyMonsterZone,
    ],
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
    phase: "battle",
    seed: 1,
    ...overrides,
  };
}

describe("declareAttack — success", () => {
  it("declara ataque direto com sucesso quando o campo do oponente está vazio", () => {
    const state = makeState({
      players: { P1: makePlayer({ field: fieldWithAttacker("attack_face_up") }), P2: makePlayer() },
    });

    const result = declareAttack(state, { type: "declare_attack", attackerZoneIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.events).toEqual([expect.objectContaining({ type: "onAttackDeclared" })]);
    }
  });

  it("declara ataque contra um alvo específico com sucesso", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithAttacker("attack_face_up") }),
        P2: makePlayer({ field: fieldWithAttacker("defense_face_up") }),
      },
    });

    const result = declareAttack(state, {
      type: "declare_attack",
      attackerZoneIndex: 0,
      targetZoneIndex: 0,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.events[0]).toMatchObject({
        type: "onAttackDeclared",
        involvedZones: [
          { player: "P1", zoneType: "monster", index: 0 },
          { player: "P2", zoneType: "monster", index: 0 },
        ],
      });
    }
  });

  it("emite onAttackDeclared e abre janela de reação com o oponente como reactingPlayer", () => {
    const state = makeState({
      players: { P1: makePlayer({ field: fieldWithAttacker("attack_face_up") }), P2: makePlayer() },
    });

    const result = declareAttack(state, { type: "declare_attack", attackerZoneIndex: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.pending).toMatchObject({
        type: "reaction_window",
        reactingPlayer: "P2",
        event: { type: "onAttackDeclared" },
      });
    }
  });
});

describe("declareAttack — rejections", () => {
  it("recusa com first_turn_attack_forbidden no primeiro turno do duelo", () => {
    const state = makeState({
      turn: 1,
      players: { P1: makePlayer({ field: fieldWithAttacker("attack_face_up") }), P2: makePlayer() },
    });

    const result = declareAttack(state, { type: "declare_attack", attackerZoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("first_turn_attack_forbidden");
  });

  it("recusa com attacker_zone_empty quando a zona do atacante está vazia", () => {
    const state = makeState();

    const result = declareAttack(state, { type: "declare_attack", attackerZoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("attacker_zone_empty");
  });

  it("recusa com attacker_not_in_attack_position quando o atacante está em defesa", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithAttacker("defense_face_up") }),
        P2: makePlayer(),
      },
    });

    const result = declareAttack(state, { type: "declare_attack", attackerZoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("attacker_not_in_attack_position");
  });

  it("recusa com attacker_already_attacked quando o atacante já atacou neste turno", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithAttacker("attack_face_up", { hasAttacked: true }) }),
        P2: makePlayer(),
      },
    });

    const result = declareAttack(state, { type: "declare_attack", attackerZoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("attacker_already_attacked");
  });

  it("recusa com target_zone_empty quando a zona-alvo informada está vazia", () => {
    const state = makeState({
      players: { P1: makePlayer({ field: fieldWithAttacker("attack_face_up") }), P2: makePlayer() },
    });

    const result = declareAttack(state, {
      type: "declare_attack",
      attackerZoneIndex: 0,
      targetZoneIndex: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("target_zone_empty");
  });

  it("recusa com direct_attack_blocked_by_monsters quando há monstros no campo do oponente e nenhum alvo foi informado", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithAttacker("attack_face_up") }),
        P2: makePlayer({ field: fieldWithAttacker("attack_face_up") }),
      },
    });

    const result = declareAttack(state, { type: "declare_attack", attackerZoneIndex: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("direct_attack_blocked_by_monsters");
  });

  it("não altera o estado em nenhum caminho de recusa", () => {
    const state = makeState({ turn: 1 });
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = declareAttack(state, { type: "declare_attack", attackerZoneIndex: 0 });

    expect(result.ok).toBe(false);
    expect(state).toEqual(snapshot);
  });

  it("aplicar declareAttack duas vezes com o mesmo estado e ação produz sempre o mesmo resultado", () => {
    const state = makeState({
      players: { P1: makePlayer({ field: fieldWithAttacker("attack_face_up") }), P2: makePlayer() },
    });
    const action = { type: "declare_attack" as const, attackerZoneIndex: 0 as const };

    expect(declareAttack(state, action)).toEqual(declareAttack(state, action));
  });
});
