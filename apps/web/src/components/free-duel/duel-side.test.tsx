// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { PublicPlayerState } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { DuelSide } from "./duel-side.tsx";

const emptyZones = [
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
] as const;

const state = {
  lp: 8000,
  hand: { visible: false, count: 5 },
  remainingDeck: 35,
  field: { monsters: emptyZones, spells: emptyZones },
} as unknown as PublicPlayerState;

function renderSide(label: string) {
  return render(
    <DuelSide
      player="P1"
      state={state}
      label={label}
      interactive={false}
      zoneAffordance={() => "idle"}
      cueFor={() => undefined}
      onZoneActivate={vi.fn()}
    />,
  );
}

describe("DuelSide", () => {
  // The approved layout puts each player's monsters in the top row of their
  // own half. The board used to mirror the player's half, which put their
  // spell/trap row above their own monsters.
  it.each(["Jogador", "Oponente"])("puts the monster row above the backrow for %s", (label) => {
    renderSide(label);

    const rows = screen.getAllByRole("list");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute("aria-label")).toBe(`Zona de monstro ${label}`);
    expect(rows[1]?.getAttribute("aria-label")).toBe(`Zona de magia/armadilha ${label}`);
  });

  it("labels the half by the player it belongs to", () => {
    renderSide("Oponente");

    expect(screen.getByLabelText("Campo Oponente")).toBeTruthy();
  });
});
