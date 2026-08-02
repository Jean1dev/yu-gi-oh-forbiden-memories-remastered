// @vitest-environment jsdom

import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import type { DuelRuntime } from "../lib/free-duel/duel-runtime.ts";
import type { DuelSession, DuelState, Duelist, ReadyDeck } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { useDuelSession, type DuelSessionContext } from "./use-duel-session.ts";

const field = {
  monsters: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
  spells: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
};
const state: DuelState = {
  players: {
    P1: { lp: 8000, hand: [], deck: [], field, handPlayUsed: false },
    P2: { lp: 8000, hand: [], deck: [], field, handPlayUsed: false },
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
  difficulty: "easy",
  profile: { strategy: "passive", parameters: {} },
  deck: [],
  dropPool: [],
};
const context: DuelSessionContext = {
  duelist,
  playerDeck: { composition: {}, cardNumbers: [], total: 40 } satisfies ReadyDeck,
};

function Harness({
  loadContext = async () => context,
  runtime,
  onMissingContext = vi.fn(),
}: {
  readonly loadContext?: () => Promise<DuelSessionContext | null>;
  readonly runtime: DuelRuntime;
  readonly onMissingContext?: () => void;
}) {
  const duel = useDuelSession({
    duelistId: "seto",
    catalogCards: [],
    loadContext,
    onMissingContext,
    createRuntime: () => runtime,
  });
  return (
    <>
      <span data-testid="status">{duel.session.status}</span>
      <button type="button" onClick={() => void duel.submitAction({ type: "advance_phase" })}>
        advance
      </button>
    </>
  );
}

function runtime(session: DuelSession): DuelRuntime {
  return {
    start: vi.fn(() => session),
    applyAction: vi.fn(),
    advanceDependencies: {
      apply: vi.fn(),
      closeReactionWindow: vi.fn(),
      aiAgent: { decide: vi.fn() },
      getPublicDuelState: vi.fn(),
    },
    resolveResult: vi.fn(),
  } as never;
}

describe("useDuelSession", () => {
  it("starts the match once under StrictMode", async () => {
    const fakeRuntime = runtime({
      status: "in_progress",
      duelSessionId: "session-1",
      duelistId: "seto",
      state,
      currentDecider: "P1",
    });

    render(
      <StrictMode>
        <Harness runtime={fakeRuntime} />
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("in_progress"));
    expect(fakeRuntime.start).toHaveBeenCalledTimes(1);
  });

  it("reports missing context without starting", async () => {
    const onMissingContext = vi.fn();
    const fakeRuntime = runtime({ status: "not_started" });

    render(
      <Harness
        runtime={fakeRuntime}
        loadContext={async () => null}
        onMissingContext={onMissingContext}
      />,
    );

    await waitFor(() => expect(onMissingContext).toHaveBeenCalledTimes(1));
    expect(fakeRuntime.start).not.toHaveBeenCalled();
  });
});
