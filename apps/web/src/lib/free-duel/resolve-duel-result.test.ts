import {
  DomainError,
  err,
  ok,
  type CreateDuelSnapshot,
  type DuelOutcome,
  type DuelState,
  type EndedDuelSession,
  type RatingEngine,
  type RatingEvaluation,
  type ReadDuelOutcome,
} from "@yugioh/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDuelResultCache,
  resolveDuelResult,
  type DuelResultIncident,
} from "./resolve-duel-result.ts";
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
const state: DuelState = {
  players: {
    P1: { lp: 1, hand: [], deck: [], field, handPlayUsed: false },
    P2: { lp: 0, hand: [], deck: [], field, handPlayUsed: false },
  },
  activeField: null,
  activePlayer: "P1",
  turn: 1,
  phase: "end",
  seed: 1,
  stats: emptyDuelStatsByPlayer(),
};
const session: EndedDuelSession = {
  status: "ended",
  duelSessionId: "duel-1",
  duelistId: "seto",
  finalState: state,
};
const victory: DuelOutcome = {
  status: "decisive",
  winner: "P1",
  loser: "P2",
  reason: "lp_depleted",
};
const evaluation: RatingEvaluation = {
  grade: "S-POW",
  reward: { stars: 29, dropTier: "official-opaque-tier" },
};

function dependencies(
  outcome: DuelOutcome = victory,
){
  const readOutcome: ReadDuelOutcome = () => ok(outcome);
  const createSnapshot: CreateDuelSnapshot = (duelState) => structuredClone(duelState);
  return {
    readOutcome,
    createSnapshot,
    ratingEngine: {
      evaluate: vi.fn<RatingEngine["evaluate"]>(async () => ok(evaluation)),
    },
    minimumReward: { stars: 7, dropTier: "configured-minimum-tier" },
    cache: createDuelResultCache(),
    logIncident: vi.fn<(incident: DuelResultIncident) => void>(),
  };
}

describe("resolveDuelResult", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves a valid opaque Rating Engine evaluation on victory", async () => {
    const deps = dependencies();
    await expect(resolveDuelResult(session, deps)).resolves.toEqual({
      status: "victory",
      duelSessionId: "duel-1",
      reason: "lp_depleted",
      rating: {
        source: "rating_engine",
        grade: evaluation.grade,
        reward: evaluation.reward,
      },
    });
    expect(deps.ratingEngine.evaluate).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: "defeat",
      outcome: {
        status: "decisive",
        winner: "P2",
        loser: "P1",
        reason: "surrender",
      } satisfies DuelOutcome,
      expected: { status: "defeat", duelSessionId: "duel-1", reason: "surrender" },
    },
    {
      name: "draw",
      outcome: {
        status: "draw",
        winner: null,
        loser: null,
        reason: "draw",
      } satisfies DuelOutcome,
      expected: { status: "draw", duelSessionId: "duel-1", reason: "draw" },
    },
  ])("does not call the Rating Engine for $name", async ({ outcome, expected }) => {
    const deps = dependencies(outcome);
    await expect(resolveDuelResult(session, deps)).resolves.toEqual(expected);
    expect(deps.ratingEngine.evaluate).not.toHaveBeenCalled();
  });

  it("applies the injected minimum reward and logs when rating fails", async () => {
    const deps = dependencies();
    deps.ratingEngine.evaluate.mockResolvedValue(
      err(new DomainError("offline", "rating_engine_unavailable")),
    );
    const result = await resolveDuelResult(session, deps);
    expect(result).toEqual({
      status: "victory",
      duelSessionId: "duel-1",
      reason: "lp_depleted",
      rating: {
        source: "minimum_fallback",
        grade: null,
        reward: { stars: 7, dropTier: "configured-minimum-tier" },
      },
    });
    expect(deps.logIncident).toHaveBeenCalledWith(
      expect.objectContaining({ code: "rating_engine_unavailable" }),
    );
  });

  it("rejects an invalid external rating response and applies the minimum", async () => {
    const deps = dependencies();
    deps.ratingEngine.evaluate.mockResolvedValue(ok({ grade: "not-a-grade", reward: { stars: -1 } } as never));
    const result = await resolveDuelResult(session, deps);
    expect(result.status).toBe("victory");
    if (result.status !== "victory") throw new Error("expected victory");
    expect(result.rating.source).toBe("minimum_fallback");
    expect(deps.logIncident).toHaveBeenCalledWith(
      expect.objectContaining({ code: "rating_engine_response_invalid" }),
    );
  });

  it("returns unavailable and never evaluates when the outcome is missing", async () => {
    const deps = dependencies();
    deps.readOutcome = () => err(new DomainError("missing", "missing_outcome"));
    await expect(resolveDuelResult(session, deps)).resolves.toEqual({
      status: "unavailable",
      duelSessionId: "duel-1",
      reason: "missing_outcome",
    });
    expect(deps.ratingEngine.evaluate).not.toHaveBeenCalled();
  });

  it("evaluates the same duel session at most once", async () => {
    const deps = dependencies();
    const first = await resolveDuelResult(session, deps);
    const second = await resolveDuelResult(session, deps);
    expect(second).toBe(first);
    expect(deps.ratingEngine.evaluate).toHaveBeenCalledOnce();
  });

  it("refuses an invalid minimum policy instead of inventing a reward", async () => {
    const deps = dependencies();
    deps.minimumReward = { stars: -1, dropTier: "" };
    await expect(resolveDuelResult(session, deps)).rejects.toMatchObject({
      code: "invalid_minimum_rating_reward",
    });
    expect(deps.ratingEngine.evaluate).not.toHaveBeenCalled();
  });
});
