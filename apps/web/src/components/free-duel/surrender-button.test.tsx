// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SurrenderButton } from "./surrender-button.tsx";

describe("SurrenderButton", () => {
  it("is available throughout an active duel", () => {
    const onClick = vi.fn();
    render(<SurrenderButton available onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Render-se" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is absent outside an active duel", () => {
    render(<SurrenderButton available={false} onClick={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Render-se" })).toBeNull();
  });
});
