import type { Card, DuelState, MonsterZone, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { advancePhase } from "./advance-phase.ts";

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

const emptyMonsterZone: MonsterZone = { occupied: false };

function occupiedZone(overrides: Partial<Extract<MonsterZone, { occupied: true }>> = {}): MonsterZone {
  return {
    occupied: true,
    card: makeCard(),
    position: "attack_face_up",
    hasAttacked: false,
    hasChangedPosition: false,
    ...overrides,
  };
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

describe("advancePhase", () => {
  it("de draw vai para main sem emitir evento", () => {
    const result = advancePhase(makeState({ phase: "draw" }));

    expect(result.state.phase).toBe("main");
    expect(result.events).toEqual([]);
  });

  it("de main vai para battle sem emitir evento", () => {
    const result = advancePhase(makeState({ phase: "main" }));

    expect(result.state.phase).toBe("battle");
    expect(result.events).toEqual([]);
  });

  it("de battle vai para end sem emitir evento", () => {
    const result = advancePhase(makeState({ phase: "battle" }));

    expect(result.state.phase).toBe("end");
    expect(result.events).toEqual([]);
  });

  it("de end troca o jogador ativo, incrementa o turno e volta a fase para draw", () => {
    const result = advancePhase(makeState({ phase: "end", activePlayer: "P1", turn: 3 }));

    expect(result.state.activePlayer).toBe("P2");
    expect(result.state.turn).toBe(4);
    expect(result.state.phase).toBe("draw");
  });

  it("de end emite onTurnEnd com originPlayer igual ao jogador que estava ativo", () => {
    const result = advancePhase(makeState({ phase: "end", activePlayer: "P1" }));

    expect(result.events[0]).toMatchObject({ type: "onTurnEnd", originPlayer: "P1" });
  });

  it("de end emite onTurnStart com originPlayer igual ao novo jogador ativo", () => {
    const result = advancePhase(makeState({ phase: "end", activePlayer: "P1" }));

    expect(result.events[1]).toMatchObject({ type: "onTurnStart", originPlayer: "P2" });
  });

  it("de end reseta hasAttacked e hasChangedPosition de todas as zonas ocupadas do jogador cujo turno terminou", () => {
    const state = makeState({
      phase: "end",
      activePlayer: "P1",
      players: {
        P1: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone({ hasAttacked: true, hasChangedPosition: true }),
              occupiedZone({ hasAttacked: true, hasChangedPosition: false }),
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
            ],
          },
        }),
        P2: makePlayer(),
      },
    });

    const result = advancePhase(state);

    const [zone0, zone1] = result.state.players.P1.field.monsters;
    expect(zone0).toMatchObject({ hasAttacked: false, hasChangedPosition: false });
    expect(zone1).toMatchObject({ hasAttacked: false, hasChangedPosition: false });
  });

  it("de end não altera as flags de turno das zonas do oponente", () => {
    const state = makeState({
      phase: "end",
      activePlayer: "P1",
      players: {
        P1: makePlayer(),
        P2: makePlayer({
          field: {
            ...emptyField(),
            monsters: [
              occupiedZone({ hasAttacked: true, hasChangedPosition: true }),
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
              emptyMonsterZone,
            ],
          },
        }),
      },
    });

    const result = advancePhase(state);

    const [zone0] = result.state.players.P2.field.monsters;
    expect(zone0).toMatchObject({ hasAttacked: true, hasChangedPosition: true });
  });

  it("de end reseta handPlayUsed do novo jogador ativo para false", () => {
    const state = makeState({
      phase: "end",
      activePlayer: "P1",
      players: {
        P1: makePlayer(),
        P2: makePlayer({ handPlayUsed: true }),
      },
    });

    const result = advancePhase(state);

    expect(result.state.players.P2.handPlayUsed).toBe(false);
  });
});
