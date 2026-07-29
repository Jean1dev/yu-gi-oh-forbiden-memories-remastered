// @vitest-environment jsdom
import type { SupabaseClient } from "@supabase/supabase-js";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSession, type SessionState } from "../../../hooks/use-session.ts";
import { createSupabaseClient } from "../../../lib/supabase/client.ts";
import { LinkEmailForm } from "./link-email-form.tsx";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));
vi.mock("../../../hooks/use-session.ts", () => ({
  useSession: vi.fn(),
}));
vi.mock("../../../lib/supabase/client.ts", () => ({
  createSupabaseClient: vi.fn(),
}));

const mockedUseSession = vi.mocked(useSession);
const mockedCreateSupabaseClient = vi.mocked(createSupabaseClient);

function mockSession(state: SessionState): void {
  mockedUseSession.mockReturnValue(state);
}

function fakeClient(updateUserResult: { data: { user: unknown }; error: unknown }): SupabaseClient {
  return {
    auth: { updateUser: vi.fn().mockResolvedValue(updateUserResult) },
  } as unknown as SupabaseClient;
}

async function fillAndSubmit(): Promise<void> {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "player@example.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "s3nha123" } });
  fireEvent.click(screen.getByRole("button", { name: "Vincular" }));
}

describe("LinkEmailForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when there is no session", () => {
    mockSession({ status: "signed-out" });

    render(<LinkEmailForm />);

    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("redirects to / when already authenticated with an e-mail", () => {
    mockSession({ status: "authenticated", playerId: "player-1", email: "player@example.com" });

    render(<LinkEmailForm />);

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("shows the misconfigured message without rendering a form", () => {
    mockSession({ status: "misconfigured" });

    render(<LinkEmailForm />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Vincular" })).toBeNull();
  });

  it("links the e-mail immediately when the response is no longer anonymous", async () => {
    mockSession({ status: "guest", playerId: "guest-1" });
    mockedCreateSupabaseClient.mockReturnValue(
      fakeClient({ data: { user: { id: "guest-1", is_anonymous: false } }, error: null }),
    );

    render(<LinkEmailForm />);
    await fillAndSubmit();

    await waitFor(() => expect(screen.getByText("E-mail vinculado! Seu progresso já está protegido.")).toBeTruthy());
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows a pending-confirmation message when the account is still anonymous after the call", async () => {
    mockSession({ status: "guest", playerId: "guest-1" });
    mockedCreateSupabaseClient.mockReturnValue(
      fakeClient({ data: { user: { id: "guest-1", is_anonymous: true } }, error: null }),
    );

    render(<LinkEmailForm />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(
        screen.getByText(
          "Enviamos um link de confirmação para o seu e-mail. Confirme para concluir a vinculação.",
        ),
      ).toBeTruthy(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("maps a duplicate e-mail error to its own message", async () => {
    mockSession({ status: "guest", playerId: "guest-1" });
    mockedCreateSupabaseClient.mockReturnValue(
      fakeClient({ data: { user: null }, error: { message: "boom", code: "email_exists" } }),
    );

    render(<LinkEmailForm />);
    await fillAndSubmit();

    await waitFor(() => expect(screen.getByText("Este e-mail já está em uso.")).toBeTruthy());
  });

  it("shows a generic failure message for any other error", async () => {
    mockSession({ status: "guest", playerId: "guest-1" });
    mockedCreateSupabaseClient.mockReturnValue(
      fakeClient({ data: { user: null }, error: { message: "boom", code: "weak_password" } }),
    );

    render(<LinkEmailForm />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByText("Não foi possível vincular o e-mail. Tente novamente.")).toBeTruthy(),
    );
  });
});
