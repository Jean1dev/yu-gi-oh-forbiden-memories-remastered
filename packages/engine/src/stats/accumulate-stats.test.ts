import type {
  Action,
  ApplyResult,
  Card,
  DuelState,
  MonsterPosition,
  MonsterZone,
  PlayerField,
  PlayerState,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { apply } from "../turn/apply.ts";
import { accumulateStats } from "./accumulate-stats.ts";
import { emptyDuelStatsByPlayer } from "./empty-stats.ts";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Test Card",
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
  return { occupied: true, card, position, hasAttacked: false, hasChangedPosition: false, equips: [] };
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

function fieldWithMonster(card: Card, position: MonsterPosition): PlayerField {
  return {
    ...emptyField(),
    monsters: [
      occupiedZone(card, position),
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
    phase: "main",
    seed: 1,
    stats: emptyDuelStatsByPlayer(),
    ...overrides,
  };
}

/**
 * A stand-in result for the action-driven counters, which never read the state
 * or the events the action produced — only the action and the state before it.
 * The combat pair is the one case that does, and it is exercised through the
 * real `apply` below instead.
 */
function unchangedResult(state: DuelState): ApplyResult {
  return { state, events: [] };
}

function statsAfter(preState: DuelState, action: Action) {
  return accumulateStats(preState, action, unchangedResult(preState)).state.stats;
}

/** Runs a declared attack all the way through `apply`, asserting both steps succeed. */
function resolveAttackThrough(state: DuelState, targetZoneIndex?: 0 | 1 | 2 | 3 | 4): DuelState {
  const declared = apply(state, {
    type: "declare_attack",
    attackerZoneIndex: 0,
    ...(targetZoneIndex !== undefined ? { targetZoneIndex } : {}),
  });
  if (!declared.ok) throw new Error(`declare_attack failed: ${declared.error.code}`);

  const resolved = apply(declared.value.state, { type: "resolve_attack" });
  if (!resolved.ok) throw new Error(`resolve_attack failed: ${resolved.error.code}`);
  return resolved.value.state;
}

/** A battle-phase state where P1's attacker faces P2's defender in the given posture. */
function battleState(attacker: Card, defender: Card, defenderPosition: MonsterPosition): DuelState {
  return makeState({
    phase: "battle",
    turn: 3,
    players: {
      P1: makePlayer({ field: fieldWithMonster(attacker, "attack_face_up") }),
      P2: makePlayer({ field: fieldWithMonster(defender, defenderPosition) }),
    },
  });
}

describe("accumulateStats — face-down plays", () => {
  it("counts a face-down summon as a face-down play for the acting player", () => {
    const monster = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [monster] }), P2: makePlayer() } });

    const stats = statsAfter(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "defense_face_down",
    });

    expect(stats.P1.faceDownPlays).toBe(1);
    expect(stats.P2.faceDownPlays).toBe(0);
  });

  it("does not count a face-up summon as a face-down play", () => {
    const monster = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [monster] }), P2: makePlayer() } });

    const stats = statsAfter(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(stats.P1.faceDownPlays).toBe(0);
  });

  it("counts a trap set as a face-down play", () => {
    const trap = makeCard({ numero: "300", tipo: "armadilha", classe: "Magic" });
    const state = makeState({ players: { P1: makePlayer({ hand: [trap] }), P2: makePlayer() } });

    const stats = statsAfter(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(stats.P1.faceDownPlays).toBe(1);
  });

  it("does not count a magic played to a spell zone as a face-down play", () => {
    const magic = makeCard({ numero: "310", tipo: "magica", classe: "Magic" });
    const state = makeState({ players: { P1: makePlayer({ hand: [magic] }), P2: makePlayer() } });

    const stats = statsAfter(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    expect(stats.P1.faceDownPlays).toBe(0);
  });
});

describe("accumulateStats — hand plays", () => {
  it("counts equip_card as an equip for the active player", () => {
    const state = makeState({ activePlayer: "P2" });

    const stats = statsAfter(state, {
      type: "equip_card",
      handIndex: 0,
      targetZone: { player: "P2", zoneType: "monster", index: 0 },
    });

    expect(stats.P2.equips).toBe(1);
    expect(stats.P1.equips).toBe(0);
  });

  it("counts activate_spell as a pure magic for the active player", () => {
    const stats = statsAfter(makeState(), { type: "activate_spell", handIndex: 0 });

    expect(stats.P1.pureMagics).toBe(1);
  });

  it("counts play_field_spell as a pure magic for the active player", () => {
    const stats = statsAfter(makeState(), { type: "play_field_spell", handIndex: 0 });

    expect(stats.P1.pureMagics).toBe(1);
  });

  it("counts complete_fusion as a fusion for the pending fusion owner", () => {
    const state = makeState({
      activePlayer: "P1",
      pendingFusion: {
        type: "fusion",
        player: "P2",
        resultCard: makeCard({ numero: "444" }),
        resolution: { materials: ["001", "002"], steps: [], result: "444", fused: true },
      },
    });

    const stats = statsAfter(state, {
      type: "complete_fusion",
      placement: { kind: "monster", zoneIndex: 0, position: "attack_face_up" },
    });

    // Credited to the fusion's owner, not to whoever happens to be active.
    expect(stats.P2.fusions).toBe(1);
    expect(stats.P1.fusions).toBe(0);
  });

  it("counts complete_fusion only once even when the placement is an equip", () => {
    const state = makeState({
      pendingFusion: {
        type: "fusion",
        player: "P1",
        resultCard: makeCard({ numero: "444", tipo: "equipamento" }),
        resolution: { materials: ["001", "002"], steps: [], result: "444", fused: true },
      },
    });

    const stats = statsAfter(state, {
      type: "complete_fusion",
      placement: { kind: "equip", targetZone: { player: "P1", zoneType: "monster", index: 0 } },
    });

    expect(stats.P1.fusions).toBe(1);
    expect(stats.P1.equips).toBe(0);
  });
});

describe("accumulateStats — combat", () => {
  it("counts an attack that destroys a defender in attack position as an effective attack", () => {
    const state = battleState(
      makeCard({ numero: "001", atk: 2000 }),
      makeCard({ numero: "002", atk: 1000, def: 900 }),
      "attack_face_up",
    );

    const stats = resolveAttackThrough(state, 0).stats;

    expect(stats.P1.effectiveAttacks).toBe(1);
    expect(stats.P1.defensiveVictories).toBe(0);
  });

  it("credits the effective attack to the attacker and never to the defender", () => {
    const state = battleState(
      makeCard({ numero: "001", atk: 2000 }),
      makeCard({ numero: "002", atk: 1000, def: 900 }),
      "attack_face_up",
    );

    const stats = resolveAttackThrough(state, 0).stats;

    expect(stats.P2.effectiveAttacks).toBe(0);
  });

  it("does not count an attack that destroys a defender in defense position", () => {
    const state = battleState(
      makeCard({ numero: "001", atk: 2000 }),
      makeCard({ numero: "002", atk: 1000, def: 900 }),
      "defense_face_up",
    );

    const stats = resolveAttackThrough(state, 0).stats;

    expect(stats.P1.effectiveAttacks).toBe(0);
    expect(stats.P2.defensiveVictories).toBe(0);
  });

  it("counts a surviving defender in defense position as a defensive victory for the defender's owner", () => {
    const state = battleState(
      makeCard({ numero: "001", atk: 1000 }),
      makeCard({ numero: "002", atk: 800, def: 2500 }),
      "defense_face_up",
    );

    const stats = resolveAttackThrough(state, 0).stats;

    expect(stats.P2.defensiveVictories).toBe(1);
    expect(stats.P1.defensiveVictories).toBe(0);
  });

  it("counts a defensive victory for a face-down defender that survives", () => {
    const state = battleState(
      makeCard({ numero: "001", atk: 1000 }),
      makeCard({ numero: "002", atk: 800, def: 2500 }),
      "defense_face_down",
    );

    const stats = resolveAttackThrough(state, 0).stats;

    expect(stats.P2.defensiveVictories).toBe(1);
  });

  it("does not count a surviving defender in attack position", () => {
    // The attacker loses the exchange, so the defender lives — but it was in
    // attack posture, which is neither an effective attack nor a defensive win.
    const state = battleState(
      makeCard({ numero: "001", atk: 1000, def: 900 }),
      makeCard({ numero: "002", atk: 2200, def: 900 }),
      "attack_face_up",
    );

    const stats = resolveAttackThrough(state, 0).stats;

    expect(stats.P1.effectiveAttacks).toBe(0);
    expect(stats.P2.defensiveVictories).toBe(0);
  });

  it("ignores a direct attack with no target", () => {
    const state = makeState({
      phase: "battle",
      turn: 3,
      players: {
        P1: makePlayer({ field: fieldWithMonster(makeCard({ atk: 2000 }), "attack_face_up") }),
        P2: makePlayer(),
      },
    });

    const stats = resolveAttackThrough(state).stats;

    expect(stats.P1.effectiveAttacks).toBe(0);
    expect(stats.P2.defensiveVictories).toBe(0);
  });
});

describe("accumulateStats — neutral cases", () => {
  const neutralActions: readonly Action[] = [
    { type: "advance_phase" },
    { type: "change_position", zone: { player: "P1", zoneType: "monster", index: 0 } },
    { type: "declare_attack", attackerZoneIndex: 0, targetZoneIndex: 0 },
    { type: "begin_fusion", player: "P1", handIndexes: [0, 1] },
    { type: "surrender", player: "P1" },
  ];

  it.each(neutralActions.map((action) => [action.type, action] as const))(
    "leaves every counter untouched for %s",
    (_label, action) => {
      const state = makeState();

      expect(statsAfter(state, action)).toEqual(emptyDuelStatsByPlayer());
    },
  );

  it("returns the events array unchanged", () => {
    const state = makeState();
    const result: ApplyResult = {
      state,
      events: [
        {
          type: "onSet",
          originPlayer: "P1",
          involvedCards: [],
          involvedZones: [],
          context: {},
        },
      ],
    };

    const accumulated = accumulateStats(
      state,
      { type: "equip_card", handIndex: 0, targetZone: { player: "P1", zoneType: "monster", index: 0 } },
      result,
    );

    expect(accumulated.events).toBe(result.events);
  });

  it("never leaves triggeredTraps above zero", () => {
    const trap = makeCard({ numero: "300", tipo: "armadilha", classe: "Magic" });
    const state = makeState({ players: { P1: makePlayer({ hand: [trap] }), P2: makePlayer() } });

    const stats = statsAfter(state, { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 });

    // The engine has no trap activation; setting one is a face-down play, not
    // a triggered trap (spec Decision 6).
    expect(stats.P1.triggeredTraps).toBe(0);
    expect(stats.P2.triggeredTraps).toBe(0);
  });

  it("does not count a complete_fusion with no pending fusion on the previous state", () => {
    const stats = statsAfter(makeState(), {
      type: "complete_fusion",
      placement: { kind: "monster", zoneIndex: 0, position: "attack_face_up" },
    });

    expect(stats).toEqual(emptyDuelStatsByPlayer());
  });

  it("does not count a play_spell_or_trap whose hand index does not exist", () => {
    const stats = statsAfter(makeState(), {
      type: "play_spell_or_trap",
      handIndex: 7,
      zoneIndex: 0,
    });

    expect(stats).toEqual(emptyDuelStatsByPlayer());
  });
});
