// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadClientRoster } from "../../lib/free-duel/load-client-roster.ts";
import { OpponentSelection } from "./opponent-selection.tsx";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../../lib/free-duel/load-client-roster.ts", () => ({
  loadClientRoster: vi.fn(),
}));

const mockedLoad = vi.mocked(loadClientRoster);
const duelist = {
  id: "seto-kaiba",
  name: "Seto Kaiba",
  portrait: "duelists/seto.webp",
  difficulty: "hard",
  profile: { strategy: "aggressive", parameters: {} },
  deck: Array.from({ length: 40 }, (_, index) => String((index % 20) + 1).padStart(3, "0")),
  dropPool: [],
} as const;

function result(overrides: Record<string, unknown> = {}) {
  return {
    roster: {
      rosterVersion: "1.0.0",
      duelists: [duelist],
      report: {
        declaredDuelists: 1,
        availableDuelists: 1,
        hidden: [],
        observedDropTiers: [],
        missingPortraits: [],
        valid: true,
      },
    },
    source: "bundle" as const,
    ...overrides,
  };
}

describe("OpponentSelection", () => {
  beforeEach(() => {
    push.mockReset();
    mockedLoad.mockReset();
    mockedLoad.mockResolvedValue(result());
  });

  it("lists each available duelist with fixed difficulty", async () => {
    render(<OpponentSelection />);
    expect(await screen.findByText("Seto Kaiba")).toBeTruthy();
    expect(screen.getByLabelText("Dificuldade: Difícil")).toBeTruthy();
    expect(screen.queryByLabelText(/escolher dificuldade/i)).toBeNull();
  });

  it("enables confirmation after keyboard-compatible selection and navigates", async () => {
    render(<OpponentSelection />);
    const card = await screen.findByRole("button", { name: /seto kaiba/i });
    const confirm = screen.getByRole("button", { name: "Iniciar Duelo" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(card);
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirm);
    expect(push).toHaveBeenCalledWith("/free-duel/seto-kaiba/prepare");
  });

  it("shows a legible empty state and keeps confirmation disabled", async () => {
    mockedLoad.mockResolvedValue(
      result({
        roster: { ...result().roster, duelists: [] },
      }),
    );
    render(<OpponentSelection />);
    expect(await screen.findByText(/ainda não foi configurada/i)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Iniciar Duelo" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("shows the cache notice", async () => {
    mockedLoad.mockResolvedValue(result({ source: "cache", notice: "cache" }));
    render(<OpponentSelection />);
    expect((await screen.findByRole("status")).textContent).toMatch(/carregada do cache/i);
  });

  it("blocks and retries when the catalog is unavailable", async () => {
    mockedLoad.mockResolvedValueOnce({
      roster: null,
      source: "empty",
      notice: "catalog_unavailable",
    });
    render(<OpponentSelection />);
    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    mockedLoad.mockResolvedValueOnce(result());
    fireEvent.click(retry);
    await waitFor(() => expect(mockedLoad.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
