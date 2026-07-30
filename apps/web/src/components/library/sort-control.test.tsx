// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SortControl } from "./sort-control.tsx";

describe("SortControl", () => {
  it("starts at ascending card number and changes the field", () => {
    const onChange = vi.fn();
    render(<SortControl value={{ field: "numero", direction: "asc" }} onChange={onChange} />);
    expect((screen.getByLabelText("Ordenar por") as HTMLSelectElement).value).toBe("numero");

    fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "atk" } });
    expect(onChange).toHaveBeenCalledWith({ field: "atk", direction: "asc" });
  });

  it("toggles direction with an accessible current-state label", () => {
    const onChange = vi.fn();
    render(<SortControl value={{ field: "atk", direction: "desc" }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Ordem decrescente/ }));
    expect(onChange).toHaveBeenCalledWith({ field: "atk", direction: "asc" });
  });
});
