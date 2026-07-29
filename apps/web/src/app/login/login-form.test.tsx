// @vitest-environment jsdom
import { DomainError, err, ok } from "@yugioh/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { continueAsGuest } from "../../lib/account/continue-as-guest.ts";
import { createSupabaseClient } from "../../lib/supabase/client.ts";
import { LoginForm } from "./login-form.tsx";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("../../lib/supabase/client.ts", () => ({
  createSupabaseClient: vi.fn(),
}));
vi.mock("../../lib/account/continue-as-guest.ts", () => ({
  continueAsGuest: vi.fn(),
}));

const mockedCreateSupabaseClient = vi.mocked(createSupabaseClient);
const mockedContinueAsGuest = vi.mocked(continueAsGuest);

describe("LoginForm guest entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues as guest without requiring email/password to be filled in", async () => {
    mockedCreateSupabaseClient.mockReturnValue({} as never);
    mockedContinueAsGuest.mockResolvedValue(ok(undefined));

    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar como convidado" }));

    await waitFor(() => expect(mockedContinueAsGuest).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows a failure message when the guest sign-in fails", async () => {
    mockedCreateSupabaseClient.mockReturnValue({} as never);
    mockedContinueAsGuest.mockResolvedValue(err(new DomainError("boom", "guest_sign_in_failed")));

    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar como convidado" }));

    await waitFor(() =>
      expect(screen.getByText("Não foi possível continuar como convidado.")).toBeTruthy(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the misconfigured message instead of calling continueAsGuest when Supabase is not set up", async () => {
    mockedCreateSupabaseClient.mockImplementation(() => {
      throw new Error("Missing Supabase configuration");
    });

    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar como convidado" }));

    expect(mockedContinueAsGuest).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
