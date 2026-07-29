// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import type { Card, DuelSession, DuelState, Duelist, ReadyDeck } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { DuelScreen, type DuelScreenContext } from "./duel-screen.tsx";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const field = {
  monsters: [
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
  ],
  spells: [
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
  ],
} as const;
const card: Card = {
  id: 1,
  numero: "001",
  nome: "Blue Dragon",
  img: null,
  classe: "Dragon",
  atk: 1000,
  def: 1000,
  guardiao1: null,
  guardiao2: null,
  password: null,
  estrelas: null,
  tipo: "monstro",
};
const state: DuelState = {
  players: {
    P1: { lp: 8000, hand: [card], deck: [], field },
    P2: { lp: 7500, hand: [], deck: [], field },
  },
  activeField: null,
  activePlayer: "P1",
  turn: 1,
  phase: "main",
  seed: 1,
};
const duelist: Duelist = {
  id: "seto",
  name: "Seto",
  portrait: "/seto.png",
  difficulty: "hard",
  profile: { strategy: "aggressive", parameters: {} },
  deck: [],
  dropPool: [],
};
const playerDeck: ReadyDeck = { composition: {}, cardNumbers: [], total: 40 };
const context: DuelScreenContext = { duelist, playerDeck };
const loadContext = async () => context;

describe("DuelScreen", () => {
  it("renders both 5+5 fields, life points and the player hand", async () => {
    const session: DuelSession = {
      status: "in_progress",
      duelSessionId: "session-1",
      duelistId: "seto",
      state,
      currentDecider: "P1",
    };
    render(<DuelScreen duelistId="seto" loadContext={loadContext} startMatch={() => session} />);
    expect(await screen.findByRole("heading", { name: "Duel" })).toBeTruthy();
    expect(screen.getAllByLabelText(/Monster zone/)).toHaveLength(10);
    expect(screen.getAllByLabelText(/Spell zone/)).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Blue Dragon" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.getByText("7500 LP")).toBeTruthy();
  });

  it("disables the hand while the CPU decides", async () => {
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => ({
          status: "in_progress",
          duelSessionId: "session-1",
          duelistId: "seto",
          state: { ...state, activePlayer: "P2" },
          currentDecider: "P2",
        })}
      />,
    );
    expect(
      (await screen.findByRole("button", { name: "Blue Dragon" })).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("shows the PRD failure message and menu action", async () => {
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => ({
          status: "failed",
          duelSessionId: "session-1",
          duelistId: "seto",
          reason: "deck_rejected_by_engine",
        })}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(/deck inválido/i);
    expect(screen.getByRole("link", { name: "Voltar ao menu" }).getAttribute("href")).toBe(
      "/free-duel",
    );
  });

  it("redirects direct navigation without a handoff", async () => {
    replace.mockReset();
    render(<DuelScreen duelistId="missing" loadContext={async () => null} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/free-duel"));
  });
});
