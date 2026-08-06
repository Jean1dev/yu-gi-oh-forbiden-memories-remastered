// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import {
  ok,
  type DuelOutcome,
  type DuelState,
  type EndedDuelSession,
  type RatingEngine,
} from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { DuelResult } from "../src/components/free-duel/duel-result.tsx";
import {
  createDuelResultCache,
  resolveDuelResult,
} from "../src/lib/free-duel/resolve-duel-result.ts";
import { emptyDuelStatsByPlayer } from "@yugioh/engine";

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
const finalState: DuelState = {
  players: {
    P1: { lp: 4000, hand: [], deck: [], field, handPlayUsed: false },
    P2: { lp: 0, hand: [], deck: [], field, handPlayUsed: false },
  },
  activeField: null,
  activePlayer: "P1",
  turn: 4,
  phase: "end",
  seed: 123,
  stats: emptyDuelStatsByPlayer(),
};

function endedSession(duelSessionId: string): EndedDuelSession {
  return {
    status: "ended",
    duelSessionId,
    duelistId: "seto",
    finalState,
  };
}

function createRatingEngine() {
  return {
    evaluate: vi.fn<RatingEngine["evaluate"]>(async () =>
      ok({
        grade: "official-grade",
        reward: { stars: 25, dropTier: "official-tier" },
      }),
    ),
  };
}

async function resolve(outcome: DuelOutcome, ratingEngine = createRatingEngine()) {
  const result = await resolveDuelResult(endedSession(`duel-${outcome.reason}`), {
    readOutcome: () => ok(outcome),
    createSnapshot: (state) => structuredClone(state),
    ratingEngine,
    minimumReward: { stars: 5, dropTier: "configured-minimum-tier" },
    cache: createDuelResultCache(),
    logIncident: vi.fn(),
  });
  return { result, ratingEngine };
}

describe("free duel F03 to F05 result integration", () => {
  it("evaluates and renders an ended victory", async () => {
    const { result, ratingEngine } = await resolve({
      status: "decisive",
      winner: "P1",
      loser: "P2",
      reason: "lp_depleted",
    });
    render(<DuelResult result={result} />);
    expect(screen.getByRole("heading", { name: "Vitória!" })).toBeTruthy();
    expect(screen.getByText("Nota official-grade")).toBeTruthy();
    expect(screen.getByText("+25 estrelas")).toBeTruthy();
    expect(ratingEngine.evaluate).toHaveBeenCalledOnce();
  });

  it("renders surrender as defeat without evaluating or exposing rewards", async () => {
    const { result, ratingEngine } = await resolve({
      status: "decisive",
      winner: "P2",
      loser: "P1",
      reason: "surrender",
    });
    render(<DuelResult result={result} />);
    expect(screen.getByRole("heading", { name: "Derrota" })).toBeTruthy();
    expect(screen.getByText("Você se rendeu.")).toBeTruthy();
    expect(screen.queryByText(/estrelas/)).toBeNull();
    expect(screen.queryByText(/^Nota /)).toBeNull();
    expect(ratingEngine.evaluate).not.toHaveBeenCalled();
  });
});
