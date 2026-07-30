// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TypeFilterControl } from "./type-filter-control.tsx";

describe("TypeFilterControl", () => {
  it("shows all when no type is selected", () => {
    render(<TypeFilterControl value={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/Tipo \(Todos\)/)).toBeTruthy();
  });

  it("adds a type and preserves existing selections", () => {
    const onChange = vi.fn();
    render(<TypeFilterControl value={["monstro"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Equipamento" }));
    expect(onChange).toHaveBeenCalledWith(["monstro", "equipamento"]);
  });

  it("removes only the selected type and returns to all after the last removal", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TypeFilterControl value={["monstro", "magica"]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Monstro" }));
    expect(onChange).toHaveBeenCalledWith(["magica"]);

    rerender(<TypeFilterControl value={["magica"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mágica" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
