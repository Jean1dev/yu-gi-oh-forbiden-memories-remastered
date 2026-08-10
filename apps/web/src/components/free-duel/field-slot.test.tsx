// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { Card } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { FieldSlot } from "./field-slot.tsx";

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

describe("FieldSlot", () => {
  it("reads as empty with no active field spell", () => {
    render(<FieldSlot card={null} />);

    expect(screen.getByText("Terreno")).toBeTruthy();
    expect(screen.getByText("Nenhum")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("names the active terrain and offers it for inspection", () => {
    const onInspect = vi.fn();
    render(<FieldSlot card={terrain} onInspect={onInspect} />);

    // "Terreno" only fits in the accessible name at 78px wide.
    const slot = screen.getByRole("button", { name: "Terreno: Wasteland" });
    expect(screen.getByText("Wasteland")).toBeTruthy();

    fireEvent.click(slot);
    expect(onInspect).toHaveBeenCalledWith(terrain);
  });
});
