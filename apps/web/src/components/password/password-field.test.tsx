// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasswordField } from "./password-field.tsx";

describe("PasswordField", () => {
  it("submits by button and Enter", () => { const submit = vi.fn(); const view = render(<PasswordField value="89631139" onChange={vi.fn()} onSubmit={submit} />); fireEvent.click(screen.getByRole("button", { name: "Buscar" })); fireEvent.submit(view.container.querySelector("form")!); expect(submit).toHaveBeenCalledTimes(2); });
  it("does not submit empty input", () => { const submit = vi.fn(); render(<PasswordField value="" onChange={vi.fn()} onSubmit={submit} />); fireEvent.click(screen.getByRole("button", { name: "Buscar" })); expect(submit).not.toHaveBeenCalled(); });
});
