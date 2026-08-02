// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { Card, PublicDuelState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { DuelBoard } from "./duel-board.tsx";

const card: Card = {
  id: 1,
  numero: "001",
  nome: "Blue Dragon",
  img: null,
  classe: "Dragon",
  atk: 1200,
  def: 900,
  guardiao1: "Sun",
  guardiao2: "Moon",
  password: null,
  estrelas: null,
  tipo: "monstro",
};

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

function view(): PublicDuelState {
  return {
    players: {
      P1: {
        lp: 8000,
        hand: { visible: true, cards: [card] },
        remainingDeck: 35,
        field: {
          monsters: [{ occupied: true, card: { visible: true, card }, position: "attack_face_up", hasAttacked: false, hasChangedPosition: false }, ...emptyMonsters.slice(1)] as never,
          spells: emptySpells,
        },
      },
      P2: {
        lp: 7500,
        hand: { visible: false, count: 5 },
        remainingDeck: 35,
        field: {
          monsters: [{ occupied: true, card: { visible: false }, position: "defense_face_down", hasAttacked: false, hasChangedPosition: false }, ...emptyMonsters.slice(1)] as never,
          spells: emptySpells,
        },
      },
    },
    activeField: null,
    activePlayer: "P1",
    turn: 1,
    phase: "main",
  };
}

describe("DuelBoard", () => {
  it("renders ten monster zones and ten spell/trap zones with Portuguese labels", () => {
    render(<DuelBoard view={view()} />);
    expect(screen.getAllByRole("button", { name: /Zona de monstro/ })).toHaveLength(10);
    expect(screen.getAllByRole("button", { name: /Zona de magia\/armadilha/ })).toHaveLength(10);
    expect(screen.getByLabelText("Campo Oponente")).toBeTruthy();
    expect(screen.getByLabelText("Campo Jogador")).toBeTruthy();
  });

  it("does not expose hidden opponent card name or stats", () => {
    render(<DuelBoard view={view()} />);
    expect(screen.getByText("Blue Dragon")).toBeTruthy();
    expect(screen.getByText("1200 / 900")).toBeTruthy();
    expect(screen.queryByLabelText(/Zona de monstro Oponente 1, Blue Dragon/)).toBeNull();
  });
});
