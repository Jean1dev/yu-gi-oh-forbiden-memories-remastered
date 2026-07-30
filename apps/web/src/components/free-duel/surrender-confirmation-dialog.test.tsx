// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SURRENDER_CONFIRMATION_MESSAGE } from "../../lib/free-duel/surrender-messages.ts";
import { SurrenderConfirmationDialog } from "./surrender-confirmation-dialog.tsx";

describe("SurrenderConfirmationDialog", () => {
  it("shows the exact PRD message and only submits on confirmation", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <SurrenderConfirmationDialog open onConfirm={onConfirm} onCancel={onCancel} />,
    );
    expect(screen.getByText(SURRENDER_CONFIRMATION_MESSAGE)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();

    rerender(<SurrenderConfirmationDialog open onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
