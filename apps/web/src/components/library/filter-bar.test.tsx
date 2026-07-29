// @vitest-environment jsdom
import { DEFAULT_LIBRARY_FILTERS } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FilterBar } from "./filter-bar.tsx";

describe("FilterBar", () => {
  it("renders status, types, sorting, direction and clear action", () => {
    render(
      <FilterBar
        filters={DEFAULT_LIBRARY_FILTERS}
        hasNonDefaultFilters={false}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText(/Tipo/)).toBeTruthy();
    expect(screen.getByLabelText("Ordenar por")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ordem crescente/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeTruthy();
  });

  it("marks obtained as default and disables clearing default filters", () => {
    render(
      <FilterBar
        filters={DEFAULT_LIBRARY_FILTERS}
        hasNonDefaultFilters={false}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect((screen.getByRole("radio", { name: "Obtidas" }) as HTMLInputElement).checked).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Limpar filtros" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("changes status without page navigation and enables clearing nondefault filters", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(
      <FilterBar
        filters={DEFAULT_LIBRARY_FILTERS}
        hasNonDefaultFilters
        onChange={onChange}
        onClear={onClear}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Todas" }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_LIBRARY_FILTERS, status: "todas" });

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("provides one collapsible mobile filter surface", () => {
    render(
      <FilterBar
        filters={DEFAULT_LIBRARY_FILTERS}
        hasNonDefaultFilters={false}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Filtros")).toHaveLength(1);
  });
});
