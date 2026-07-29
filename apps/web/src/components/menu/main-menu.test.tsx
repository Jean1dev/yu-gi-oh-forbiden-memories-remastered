// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signOut, useSession, type SessionState } from "../../hooks/use-session.ts";
import { MainMenu } from "./main-menu.tsx";

vi.mock("../../hooks/use-session.ts", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

const mockedUseSession = vi.mocked(useSession);

function mockSession(state: SessionState): void {
  mockedUseSession.mockReturnValue(state);
}

describe("MainMenu session bar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a sign-in link when signed out", () => {
    mockSession({ status: "signed-out" });

    render(<MainMenu />);

    expect(screen.getByRole("link", { name: "Entrar" }).getAttribute("href")).toBe("/login");
  });

  it("shows the guest prompt, a link-email link and a sign-out button for a guest session", () => {
    mockSession({ status: "guest", playerId: "guest-1" });

    render(<MainMenu />);

    expect(screen.getByRole("link", { name: "Vincular e-mail" }).getAttribute("href")).toBe(
      "/login/link-email",
    );
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });

  it("shows the e-mail and a sign-out button when authenticated", () => {
    mockSession({ status: "authenticated", playerId: "player-1", email: "player@example.com" });

    render(<MainMenu />);

    expect(screen.getByText("player@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });

  it("wires the sign-out button to signOut", () => {
    mockSession({ status: "guest", playerId: "guest-1" });

    render(<MainMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(signOut).toHaveBeenCalled();
  });
});
