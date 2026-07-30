// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { ok, type Card, type DropPool, type DuelSession, type DuelState, type Duelist, type ReadyDeck } from "@yugioh/shared";
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

  it("renders the consolidated result for an ended duel", async () => {
    const session: DuelSession = {
      status: "ended",
      duelSessionId: "session-1",
      duelistId: "seto",
      finalState: { ...state, phase: "end" },
    };
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => session}
        resolveResult={async () => ({
          status: "defeat",
          duelSessionId: "session-1",
          reason: "rendicao",
        })}
      />,
    );
    expect(await screen.findByRole("heading", { name: "Derrota" })).toBeTruthy();
    expect(screen.getByText("Você se rendeu.")).toBeTruthy();
    expect(screen.queryByText(/estrelas/)).toBeNull();
    expect(screen.getByRole("link", { name: "Revanche" }).getAttribute("href")).toBe(
      "/free-duel/seto/prepare",
    );
    expect(screen.getByRole("link", { name: "Trocar oponente" }).getAttribute("href")).toBe(
      "/free-duel",
    );
    expect(screen.getByRole("link", { name: "Voltar ao menu" }).getAttribute("href")).toBe("/");
  });

  it("does not render post-duel actions while the session is in progress", async () => {
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => ({
          status: "in_progress",
          duelSessionId: "session-1",
          duelistId: "seto",
          state,
          currentDecider: "P1",
        })}
      />,
    );
    await screen.findByRole("heading", { name: "Duel" });
    expect(screen.queryByRole("link", { name: "Revanche" })).toBeNull();
  });

  it("does not render post-duel actions when orchestration failed", async () => {
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => ({
          status: "failed",
          duelSessionId: "session-1",
          duelistId: "seto",
          reason: "ai_unavailable",
        })}
      />,
    );
    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: "Revanche" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Trocar oponente" })).toBeNull();
  });

  it("fails safely when result contracts are not composed", async () => {
    const session: DuelSession = {
      status: "ended",
      duelSessionId: "session-1",
      duelistId: "seto",
      finalState: { ...state, phase: "end" },
    };
    render(<DuelScreen duelistId="seto" loadContext={loadContext} startMatch={() => session} />);
    expect(await screen.findByRole("heading", { name: "Resultado indisponível" })).toBeTruthy();
    expect(screen.queryByText(/estrelas/)).toBeNull();
  });

  it("passes the loaded duelist's dropPool to grantVictoryReward on a victory result", async () => {
    const dropPool: DropPool = [{ tier: "common", cardNumbers: ["001"] }];
    const contextWithDropPool: DuelScreenContext = {
      duelist: { ...duelist, dropPool },
      playerDeck,
    };
    const session: DuelSession = {
      status: "ended",
      duelSessionId: "session-1",
      duelistId: "seto",
      finalState: { ...state, phase: "end" },
    };
    const grantVictoryReward = vi.fn(async () =>
      ok({
        outcome: { cardNumber: "001" as const, source: "duelist_pool" as const, tier: "common" },
        reward: { status: "applied" as const, cardQuantity: 1, walletStars: 10 },
      }),
    );

    render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => contextWithDropPool}
        startMatch={() => session}
        resolveResult={async () => ({
          status: "victory",
          duelSessionId: "session-1",
          reason: "lp_zerado",
          rating: { source: "rating_engine", grade: "A", reward: { stars: 10, dropTier: "common" } },
        })}
        grantVictoryReward={grantVictoryReward}
      />,
    );

    await waitFor(() => expect(grantVictoryReward).toHaveBeenCalledTimes(1));
    expect(grantVictoryReward).toHaveBeenCalledWith(expect.anything(), dropPool);
  });
});
