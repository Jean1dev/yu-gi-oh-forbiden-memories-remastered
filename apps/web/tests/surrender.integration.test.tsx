// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ApplyResult, DuelSession, DuelState, Duelist, ReadyDeck } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import {
  DuelScreen,
  type DuelScreenContext,
} from "../src/app/free-duel/[duelistId]/duel/duel-screen.tsx";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const emptyField = {
  monsters: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
  spells: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
};
const activeState: DuelState = {
  players: {
    P1: { lp: 8000, hand: [], deck: [], field: emptyField },
    P2: { lp: 8000, hand: [], deck: [], field: emptyField },
  },
  activeField: null,
  activePlayer: "P2",
  turn: 1,
  phase: "main",
  seed: 1,
};
const endedState: DuelState = { ...activeState, phase: "end" };
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
      (): ApplyResult => ({ state: endedState, events: [{ type: "duel_ended" }] as never }),
    );
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => context}
        startMatch={() => session}
        applyAction={apply}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Render-se" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(apply).toHaveBeenCalledWith(activeState, {
      type: "surrender",
      playerId: "P1",
    });
    expect(await screen.findByText("Duel ended.")).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Render-se" })).toBeNull(),
    );
  });
});
