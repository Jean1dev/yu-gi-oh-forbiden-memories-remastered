// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { INITIAL_LP, type Card } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { DuelLpBar } from "./duel-lp-bar.tsx";

const terrain: Card = {
  id: 12,
  numero: "012",
  nome: "Wasteland",
  img: null,
  classe: "Magic",
  atk: null,
  def: null,
  guardiao1: null,
  guardiao2: null,
  password: null,
  estrelas: null,
  tipo: "magica",
};

describe("DuelLpBar", () => {
  it("shows both life totals under their role labels", () => {
    render(
      <DuelLpBar
        playerLp={8000}
        opponentLp={6200}
        playerName="Você"
        opponentName="Simon Muran"
        activeField={null}
      />,
    );

    expect(screen.getByLabelText("Jogador pontos de vida").textContent).toContain("8000 LP");
    expect(screen.getByLabelText("Oponente pontos de vida").textContent).toContain("6200 LP");
    expect(screen.getByText("Simon Muran")).toBeTruthy();
  });

  it("clamps the life track when a spell pushes a player above the starting total", () => {
    const { container } = render(
      <DuelLpBar playerLp={INITIAL_LP * 2} opponentLp={0} activeField={null} />,
    );

    const fills = container.querySelectorAll("span > span");
    expect(fills[0]?.getAttribute("style")).toBe("width: 100%;");
    expect(fills[1]?.getAttribute("style")).toBe("width: 0%;");
  });

  it("announces the terrain, and its absence", () => {
    const onInspectField = vi.fn();
    const { rerender } = render(<DuelLpBar playerLp={8000} opponentLp={8000} activeField={null} />);
    expect(screen.getByText("Nenhum")).toBeTruthy();

    rerender(
      <DuelLpBar
        playerLp={8000}
        opponentLp={8000}
        activeField={terrain}
        onInspectField={onInspectField}
      />,
    );
    const slot = screen.getByRole("button", { name: "Terreno: Wasteland" });
    slot.click();
    expect(onInspectField).toHaveBeenCalledWith(terrain);
  });
});
