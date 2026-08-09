import type {
  Card,
  DuelState,
  MonsterPosition,
  MonsterZone,
  Phase,
  PlayerField,
  PlayerState,
  ReactionWindow,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createEvent } from "../events/index.ts";
import { changePosition } from "./change-position.ts";
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
    stats: emptyDuelStatsByPlayer(),
    ...overrides,
  };
}

describe("changePosition — success", () => {
  it("muda um monstro de attack_face_up para defense_face_up sem emitir onFlip", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_up"),
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

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const zone = result.value.state.players.P1.field.monsters[0];
    expect(zone).toMatchObject({ position: "defense_face_up", hasChangedPosition: true });
    expect(result.value.events).toEqual([expect.objectContaining({ type: "onPositionChange" })]);
  });

  it("muda um monstro de defense_face_up para attack_face_up sem emitir onFlip", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("defense_face_up"),
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

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players.P1.field.monsters[0]).toMatchObject({
      position: "attack_face_up",
    });
    expect(result.value.events).toEqual([expect.objectContaining({ type: "onPositionChange" })]);
  });

  it("revela um monstro em defense_face_down, movendo-o para attack_face_up e emitindo onFlip seguido de onPositionChange", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("defense_face_down"),
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

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players.P1.field.monsters[0]).toMatchObject({
      position: "attack_face_up",
    });
    expect(result.value.events.map((e) => e.type)).toEqual(["onFlip", "onPositionChange"]);
  });

  it("revela um monstro em attack_face_down, movendo-o para defense_face_up e emitindo onFlip seguido de onPositionChange", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_down"),
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

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players.P1.field.monsters[0]).toMatchObject({
      position: "defense_face_up",
    });
    expect(result.value.events.map((e) => e.type)).toEqual(["onFlip", "onPositionChange"]);
  });

  it("marca hasChangedPosition como true na zona alterada", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_up"),
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

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.monsters[0]).toMatchObject({
        hasChangedPosition: true,
      });
    }
  });

  it("não altera hasAttacked da zona alterada", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_up", { hasAttacked: false }),
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

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.monsters[0]).toMatchObject({ hasAttacked: false });
    }
  });

  it("não altera handPlayUsed de nenhum dos jogadores", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_up"),
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

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.handPlayUsed).toBe(false);
      expect(result.value.state.players.P2.handPlayUsed).toBe(false);
    }
  });

  it("não altera as demais zonas de monstro do jogador ativo", () => {
    const untouched = occupiedZone("defense_face_down", { hasAttacked: true });
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_up"),
              untouched,
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
            ],
          },
        }),
        P2: makePlayer(),
      },
    });

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P1.field.monsters[1]).toEqual(untouched);
    }
  });

  it("não altera nenhuma zona do jogador oponente", () => {
    const opponentField = {
      ...emptyField(),
      monsters: [
        occupiedZone("attack_face_down"),
        emptyMonsterZone,
        emptyMonsterZone,
        emptyMonsterZone,
        emptyMonsterZone,
      ] as PlayerField["monsters"],
    };
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_up"),
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
            ],
          },
        }),
        P2: makePlayer({ field: opponentField }),
      },
    });

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.P2.field).toEqual(opponentField);
    }
  });
});

describe("changePosition — rejections", () => {
  it("recusa com already_attacked quando o monstro já atacou neste turno, sem alterar o estado", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_up", { hasAttacked: true }),
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
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("already_attacked");
    expect(state).toEqual(snapshot);
  });

  it("recusa com already_changed_position quando a zona já mudou de posição neste turno, sem alterar o estado", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_up", { hasChangedPosition: true }),
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
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("already_changed_position");
    expect(state).toEqual(snapshot);
  });

  it("recusa com zone_empty quando a zona apontada está vazia, sem alterar o estado", () => {
    const state = makeState();
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("zone_empty");
    expect(state).toEqual(snapshot);
  });

  it.each<Phase>(["draw", "main", "end"])(
    "recusa com wrong_phase na fase %s, sem alterar o estado",
    (phase) => {
      const state = makeState({
        phase,
        players: {
          P1: makePlayer({
            field: {
              ...emptyField(),
              monsters: [
                occupiedZone("attack_face_up"),
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
      const snapshot = JSON.parse(JSON.stringify(state));

      const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("wrong_phase");
      expect(state).toEqual(snapshot);
    },
  );

  it("recusa com zone_not_owned_by_active_player quando zone.player é o jogador inativo, sem alterar o estado", () => {
    const state = makeState({
      activePlayer: "P1",
      players: {
        P1: makePlayer(),
        P2: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone("attack_face_up"),
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
            ],
          },
        }),
      },
    });
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = changePosition(state, { player: "P2", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("zone_not_owned_by_active_player");
    expect(state).toEqual(snapshot);
  });

  it("recusa com zone_not_monster quando zone.zoneType é spell, sem alterar o estado", () => {
    const state = makeState();
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = changePosition(state, { player: "P1", zoneType: "spell", index: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("zone_not_monster");
    expect(state).toEqual(snapshot);
  });

  it("recusa com reaction_window_open quando state.pending está definido, sem alterar o estado", () => {
    const pending: ReactionWindow = {
      type: "reaction_window",
      event: createEvent({ type: "onAttackDeclared", originPlayer: "P1" }),
      reactingPlayer: "P2",
    };
    const state = makeState({ pending });
    const snapshot = JSON.parse(JSON.stringify(state));

    const result = changePosition(state, { player: "P1", zoneType: "monster", index: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("reaction_window_open");
    expect(state).toEqual(snapshot);
  });
});
