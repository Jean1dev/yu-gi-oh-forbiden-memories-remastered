// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  ok,
  type ApplyResult,
  type DuelSession,
  type DuelState,
  type Duelist,
  type ReadyDeck,
} from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import {
  DuelScreen,
  type DuelScreenContext,
} from "../src/app/free-duel/[duelistId]/duel/duel-screen.tsx";
import { emptyDuelStatsByPlayer } from "@yugioh/engine";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const emptyField = {
  monsters: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
  spells: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
};
const activeState: DuelState = {
  players: {
    P1: { lp: 8000, hand: [], deck: [], field: emptyField, handPlayUsed: false },
    P2: { lp: 8000, hand: [], deck: [], field: emptyField, handPlayUsed: false },
  },
  activeField: null,
  activePlayer: "P2",
  turn: 1,
  phase: "main",
  seed: 1,
  stats: emptyDuelStatsByPlayer(),
};
const endedState: DuelState = {
  ...activeState,
  outcome: { status: "decisive", winner: "P2", loser: "P1", reason: "surrender" },
};
const duelist = {
  id: "seto",
  name: "Seto",
  portrait: "/seto.png",
  difficulty: "hard",
  profile: { strategy: "aggressive", parameters: {} },
  deck: [],
  dropPool: [],
} satisfies Duelist;
const context: DuelScreenContext = {
  duelist,
  playerDeck: { composition: {}, cardNumbers: [], total: 40 } satisfies ReadyDeck,
};
const session: DuelSession = {
  status: "in_progress",
  duelSessionId: "duel-1",
  duelistId: "seto",
  state: activeState,
  currentDecider: "P2",
};

describe("surrender integration", () => {
  it("confirms a defeat-producing engine intent outside the player's turn", async () => {
    const apply = vi.fn(
      () => ok({ state: endedState, events: [] } satisfies ApplyResult),
    );
    const resolveResult = vi.fn(async (ended: Extract<DuelSession, { status: "ended" }>) => ({
      status: "defeat" as const,
      duelSessionId: ended.duelSessionId,
      reason: "surrender" as const,
    }));
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => context}
        startMatch={() => session}
        applyAction={apply}
        resolveResult={resolveResult}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Render-se" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(apply).toHaveBeenCalledWith(activeState, {
      type: "surrender",
      player: "P1",
    });
    expect(resolveResult).toHaveBeenCalledWith({
      status: "ended",
      duelSessionId: "duel-1",
      duelistId: "seto",
      finalState: endedState,
    });
    expect(
      await screen.findByRole("heading", { name: "Derrota" }),
    ).toBeTruthy();
    expect(screen.getByText("Você se rendeu.")).toBeTruthy();
    expect(screen.queryByText(/estrelas/)).toBeNull();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Render-se" })).toBeNull(),
    );
  });
});
