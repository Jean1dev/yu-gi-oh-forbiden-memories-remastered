// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LibrarySearchField } from "./search-field.tsx";

describe("LibrarySearchField", () => {
  it("renders the term from the URL", () => {
    render(<LibrarySearchField term="dragon" onChange={vi.fn()} onClear={vi.fn()} />);
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("dragon");
  });

  it("reports every change without taking focus from the field", () => {
    const onChange = vi.fn();
    render(<LibrarySearchField term="" onChange={onChange} onClear={vi.fn()} />);
    const field = screen.getByRole("searchbox");

    field.focus();
    fireEvent.change(field, { target: { value: "blue" } });

    expect(onChange).toHaveBeenCalledWith("blue");
    expect(document.activeElement).toBe(field);
  });

  it("offers accessible names for the field and clear action", () => {
    render(<LibrarySearchField term="dragon" onChange={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByRole("searchbox", { name: "Buscar carta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Limpar busca" })).toBeTruthy();
  });

  it("calls the clear action and disables it for an empty term", () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <LibrarySearchField term="dragon" onChange={vi.fn()} onClear={onClear} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(onClear).toHaveBeenCalledOnce();

    rerender(<LibrarySearchField term="" onChange={vi.fn()} onClear={onClear} />);
    expect(
      (screen.getByRole("button", { name: "Limpar busca" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
