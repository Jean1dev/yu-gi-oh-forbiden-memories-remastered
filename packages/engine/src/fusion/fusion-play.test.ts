import type { Card, DuelState, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { createApply } from "../turn/apply.ts";

function card(numero: string, nome = numero): Card {
  return {
    id: Number(numero),
    numero,
    nome,
    img: null,
    classe: "Dragon",
    atk: 1000,
    def: 1000,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}
function field(): PlayerField {
  const empty = { occupied: false } as const;
  return {
    monsters: [empty, empty, empty, empty, empty],
    spells: [empty, empty, empty, empty, empty],
  };
}
function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return { lp: 8000, hand: [], deck: [], field: field(), handPlayUsed: false, ...overrides };
}
function state(hand: readonly Card[]): DuelState {
  return {
    players: { P1: player({ hand }), P2: player() },
    activeField: null,
    activePlayer: "P1",
    turn: 1,
    phase: "main",
    seed: 1,
  };
}

describe("fusion play", () => {
  it("consumes ordered materials and requires placement", () => {
    const resultCard = card("010", "Fusion");
    const apply = createApply({
      resolveFusion: (materials) => ({
        materials,
        result: "010",
        fused: true,
        steps: [{ accumulator: "001", material: "002", result: "010" }],
      }),
      getCard: (number) => (number === "010" ? resultCard : undefined),
    });
    const begun = apply(state([card("001"), card("002")]), {
      type: "begin_fusion",
      player: "P1",
      handIndexes: [0, 1],
    });
    expect(begun.ok).toBe(true);
    if (!begun.ok) return;
    expect(begun.value.state.players.P1.hand).toEqual([]);
    expect(begun.value.state.pendingFusion?.resultCard).toBe(resultCard);
    const completed = apply(begun.value.state, {
      type: "complete_fusion",
      placement: { kind: "monster", zoneIndex: 0, position: "attack_face_up" },
    });
    expect(completed.ok).toBe(true);
    if (completed.ok)
      expect(completed.value.state.players.P1.field.monsters[0]).toMatchObject({
        occupied: true,
        card: resultCard,
      });
  });
});
