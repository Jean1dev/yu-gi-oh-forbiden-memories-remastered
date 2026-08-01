// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DuelTopBar } from "./duel-top-bar.tsx";

describe("DuelTopBar", () => {
  it("shows terrain, phase and turn in Portuguese", () => {
    render(<DuelTopBar terrainName="Forest" phase="battle" turn={3} onExit={() => undefined} />);
    expect(screen.getByText("Terreno: Forest")).toBeTruthy();
    expect(screen.getByText("Fase: Batalha")).toBeTruthy();
    expect(screen.getByText("Turno: 3")).toBeTruthy();
  });

  it("shows Nenhum when there is no active terrain and calls exit", () => {
    const onExit = vi.fn();
    render(<DuelTopBar terrainName={null} phase="main" turn={1} onExit={onExit} />);
    expect(screen.getByText("Terreno: Nenhum")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sair do Duelo" }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
