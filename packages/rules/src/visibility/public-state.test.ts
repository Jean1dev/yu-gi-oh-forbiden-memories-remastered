import type { Card, DuelState, PlayerField } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { getPublicDuelState } from "./public-state.ts";

function card(numero: string): Card {
  return {
    id: Number(numero),
    numero,
    nome: `Card ${numero}`,
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

const emptyMonsters = [
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
] as const;
const emptySpells = [
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
] as const;

function field(monster: Card, faceUp: boolean): PlayerField {
  return {
    monsters: [
      {
        occupied: true,
        card: monster,
        position: faceUp ? "attack_face_up" : "defense_face_down",
        hasAttacked: false,
        hasChangedPosition: false,
      },
      emptyMonsters[1],
      emptyMonsters[2],
      emptyMonsters[3],
      emptyMonsters[4],
    ],
    spells: [
      { occupied: true, card: monster, faceUp },
      emptySpells[1],
      emptySpells[2],
      emptySpells[3],
      emptySpells[4],
    ],
  };
}

function duelState(): DuelState {
  const own = card("001");
  const opponent = card("002");
  return {
    players: {
      P1: { lp: 8000, hand: [own], deck: [own, own], field: field(own, false) },
      P2: { lp: 7000, hand: [opponent], deck: [opponent], field: field(opponent, false) },
    },
    activeField: own,
    activePlayer: "P1",
    turn: 2,
    phase: "main",
    seed: 123,
  };
}

describe("public duel state", () => {
  it("reveals the viewer's hand and entire field but only deck counts", () => {
    const result = getPublicDuelState(duelState(), "P1");
    expect(result.players.P1.hand).toEqual({ visible: true, cards: [card("001")] });
    expect(result.players.P1.field.monsters[0]).toMatchObject({
      card: { visible: true, card: card("001") },
    });
    expect(result.players.P1.remainingDeck).toBe(2);
    expect(result).not.toHaveProperty("seed");
  });

  it("hides the opponent's hand and face-down field cards", () => {
    const result = getPublicDuelState(duelState(), "P1");
    expect(result.players.P2.hand).toEqual({ visible: false, count: 1 });
    expect(result.players.P2.field.monsters[0]).toMatchObject({ card: { visible: false } });
    expect(result.players.P2.field.spells[0]).toMatchObject({ card: { visible: false } });
  });

  it("reveals face-up opponent cards and preserves public state", () => {
    const state = duelState();
    const opponent = card("002");
    const faceUpState: DuelState = {
      ...state,
      players: {
        ...state.players,
        P2: { ...state.players.P2, field: field(opponent, true) },
      },
    };
    const result = getPublicDuelState(faceUpState, "P1");
    expect(result.players.P2.field.monsters[0]).toMatchObject({
      card: { visible: true, card: opponent },
    });
    expect(result.activeField).toEqual(card("001"));
    expect(faceUpState).toEqual({
      ...state,
      players: { ...state.players, P2: { ...state.players.P2, field: field(opponent, true) } },
    });
  });

  it("applies field visibility to cards involved in a pending event", () => {
    const state = duelState();
    const hidden = card("002");
    const withPending: DuelState = {
      ...state,
      pending: {
        type: "reaction_window",
        reactingPlayer: "P1",
        event: {
          type: "onSet",
          originPlayer: "P2",
          involvedCards: [hidden],
          involvedZones: [{ player: "P2", zoneType: "monster", index: 0 }],
          context: {},
        },
      },
    };
    expect(getPublicDuelState(withPending, "P1").pending?.event.involvedCards).toEqual([
      { visible: false },
    ]);
  });
});
