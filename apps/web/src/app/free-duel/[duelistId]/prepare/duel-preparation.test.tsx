// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActiveDeckVerification } from "../../../../hooks/use-active-deck-verification.ts";
import { useSession } from "../../../../hooks/use-session.ts";
import { DuelPreparation } from "./duel-preparation.tsx";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../../../../hooks/use-session.ts", () => ({ useSession: vi.fn() }));
vi.mock("../../../../hooks/use-active-deck-verification.ts", () => ({
  useActiveDeckVerification: vi.fn(),
}));

const mockedVerification = vi.mocked(useActiveDeckVerification);
const retry = vi.fn();

describe("DuelPreparation", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ status: "guest", playerId: "p1" });
    push.mockReset();
    retry.mockReset();
  });

  it.each([
    ["missing_deck", /ainda não tem um deck pronto/i],
    ["invalid_deck", /deck está inválido/i],
  ] as const)("blocks %s and links to Build Deck", (reason, message) => {
    mockedVerification.mockReturnValue({
      state: {
        status: "resolved",
        verification: {
          status: "blocked",
          hasValidDeck: false,
          reason,
          violations: [],
          origin: "server",
        },
      },
      retry,
    });
    render(<DuelPreparation duelistId="kaiba" />);
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir para Build Deck" }).getAttribute("href")).toBe(
      "/build-deck",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("retries an unavailable load", () => {
    mockedVerification.mockReturnValue({
      state: {
        status: "resolved",
        verification: { status: "unavailable", hasValidDeck: false, reason: "load_failed" },
      },
      retry,
    });
    render(<DuelPreparation duelistId="kaiba" />);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("hands the duelist route to F03 only for a ready deck", () => {
    mockedVerification.mockReturnValue({
      state: {
        status: "resolved",
        verification: {
          status: "ready",
          hasValidDeck: true,
          origin: "server",
          readyDeck: { composition: {}, cardNumbers: [], total: 40 },
        },
      },
      retry,
    });
    render(<DuelPreparation duelistId="kaiba" />);
    fireEvent.click(screen.getByRole("button", { name: "Start duel" }));
    expect(push).toHaveBeenCalledWith("/free-duel/kaiba/duel");
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
