import type {
  Card,
  DuelState,
  MonsterPosition,
  MonsterZone,
  PlayerField,
  PlayerState,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { summonMonster } from "./summon-monster.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

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
  overrides: Partial<Extract<MonsterZone, { occupied: true }>> = {},
): MonsterZone {
  return {
    occupied: true,
    card: makeCard({ numero: "999" }),
    position: "attack_face_up",
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

describe("summonMonster — success", () => {
  const positions: readonly [MonsterPosition, "onSummon" | "onSet"][] = [
    ["attack_face_up", "onSummon"],
    ["attack_face_down", "onSet"],
    ["defense_face_up", "onSummon"],
    ["defense_face_down", "onSet"],
  ];

  it.each(positions)(
    "places the monster in the chosen zone in the %s position and emits %s",
    (position, eventType) => {
      const card = makeCard();
      const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

      const result = summonMonster(state, {
        type: "summon_monster",
        player: "P1",
        handIndex: 0,
        zoneIndex: 2,
        position,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const zone = result.value.state.players.P1.field.monsters[2];
      expect(zone).toMatchObject({ occupied: true, card, position });
      expect(result.value.events).toEqual([expect.objectContaining({ type: eventType })]);
    },
  );

  it("removes the summoned card from the player's hand", () => {
    const card = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.hand).toEqual([]);
    }
  });

  it("marks handPlayUsed as true for the summoning player after a successful summon", () => {
    const card = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.handPlayUsed).toBe(true);
    }
  });

  it("opens a reaction window with the opponent as reactingPlayer", () => {
    const card = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.pending).toMatchObject({
        type: "reaction_window",
        reactingPlayer: "P2",
      });
    }
  });

  it("does not overwrite the placed card's base atk/def", () => {
    const card = makeCard({ atk: 2500, def: 2000 });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const zone = result.value.state.players.P1.field.monsters[0];
      expect(zone.occupied && zone.card.atk).toBe(2500);
      expect(zone.occupied && zone.card.def).toBe(2000);
    }
  });

  it("does not mutate the state object it receives", () => {
    const card = makeCard();
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });
    const snapshot = JSON.parse(JSON.stringify(state));

    summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(state).toEqual(snapshot);
  });
});

describe("summonMonster — rejections", () => {
  it("rejects with hand_play_already_used when the player already used this turn's hand play", () => {
    const card = makeCard();
    const state = makeState({
      players: { P1: makePlayer({ hand: [card], handPlayUsed: true }), P2: makePlayer() },
    });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("hand_play_already_used");
  });

  it("rejects with card_not_in_hand when handIndex is negative", () => {
    const state = makeState({
      players: { P1: makePlayer({ hand: [makeCard()] }), P2: makePlayer() },
    });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: -1,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("card_not_in_hand");
  });

  it("rejects with card_not_in_hand when handIndex is beyond the hand's length", () => {
    const state = makeState({
      players: { P1: makePlayer({ hand: [makeCard()] }), P2: makePlayer() },
    });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 5,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("card_not_in_hand");
  });

  it("rejects with unsummonable_card_type when the card at handIndex is armadilha/equipamento/magica", () => {
    const card = makeCard({ tipo: "armadilha" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unsummonable_card_type");
  });

  it("rejects with no_free_monster_zone when all 5 monster zones are occupied", () => {
    const card = makeCard();
    const state = makeState({
      players: {
        P1: makePlayer({
          hand: [card],
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone(),
              occupiedZone(),
              occupiedZone(),
              occupiedZone(),
              occupiedZone(),
            ],
          },
        }),
        P2: makePlayer(),
      },
    });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("no_free_monster_zone");
  });

  it("rejects with monster_zone_occupied when the chosen zone is occupied but another zone is free", () => {
    const card = makeCard();
    const state = makeState({
      players: {
        P1: makePlayer({
          hand: [card],
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone(),
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
            ],
          },
        }),
        P2: makePlayer(),
      },
    });

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("monster_zone_occupied");
  });

  it("returns the original state unchanged on every rejection path", () => {
    const card = makeCard({ tipo: "armadilha" });
    const state = makeState({ players: { P1: makePlayer({ hand: [card] }), P2: makePlayer() } });
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = summonMonster(state, {
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "attack_face_up",
    });

    expect(result.ok).toBe(false);
    expect(state).toEqual(snapshot);
  });
});
