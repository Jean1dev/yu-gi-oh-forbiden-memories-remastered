// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TurnChip } from "./turn-chip.tsx";

describe("TurnChip", () => {
  it("reports the turn and the phase in Portuguese", () => {
    render(<TurnChip turn={3} phase="battle" />);

    expect(screen.getByText("Turno: 3")).toBeTruthy();
    expect(screen.getByText("Fase: Batalha")).toBeTruthy();
  });

  it("translates every phase label", () => {
    const { rerender } = render(<TurnChip turn={1} phase="draw" />);
    expect(screen.getByText("Fase: Compra")).toBeTruthy();

    rerender(<TurnChip turn={1} phase="main" />);
    expect(screen.getByText("Fase: Principal")).toBeTruthy();

    rerender(<TurnChip turn={1} phase="end" />);
    expect(screen.getByText("Fase: Fim")).toBeTruthy();
  });
});
