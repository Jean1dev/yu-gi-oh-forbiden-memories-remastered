import {
  ConsolidatedDuelResultSchema,
  DomainError,
  DuelOutcomeSchema,
  MinimumRatingRewardSchema,
  RatingEvaluationSchema,
  type ConsolidatedDuelResult,
  type CreateDuelSnapshot,
  type EndedDuelSession,
  type MinimumRatingReward,
  type PlayerId,
  type RatingEngine,
  type ReadDuelOutcome,
} from "@yugioh/shared";

import { log } from "../logging.ts";
import { consolidateDuelResult } from "./consolidate-duel-result.ts";

/** The side the local player always occupies in an offline Free Duel. */
const HUMAN_PLAYER: PlayerId = "P1";

export type DuelResultIncident =
  | Readonly<{
      code: "duel_outcome_unavailable" | "duel_outcome_invalid";
      duelSessionId: string;
      error?: unknown;
    }>
  | Readonly<{
      code: "rating_engine_unavailable" | "rating_engine_response_invalid";
      duelSessionId: string;
      error?: unknown;
    }>;

export type DuelResultCache = Readonly<{
  get(duelSessionId: string): ConsolidatedDuelResult | undefined;
  set(duelSessionId: string, result: ConsolidatedDuelResult): void;
}>;

export type ResolveDuelResultDependencies = Readonly<{
  readOutcome: ReadDuelOutcome;
  createSnapshot: CreateDuelSnapshot;
  ratingEngine: RatingEngine;
  minimumReward: unknown;
  cache?: DuelResultCache | undefined;
  logIncident?: ((incident: DuelResultIncident) => void) | undefined;
}>;

export function createDuelResultCache(): DuelResultCache {
  const results = new Map<string, ConsolidatedDuelResult>();
  return {
    get: (duelSessionId) => results.get(duelSessionId),
    set: (duelSessionId, result) => {
      results.set(duelSessionId, result);
    },
  };
}

const defaultCache = createDuelResultCache();

function defaultLogIncident(incident: DuelResultIncident): void {
  const { code, duelSessionId, error } = incident;
  log(code.startsWith("duel_outcome") ? "error" : "warn", code, {
    duelSessionId,
    ...(error === undefined
      ? {}
      : { cause: error instanceof Error ? error.message : "unknown error" }),
  });
}

function unavailableResult(
  duelSessionId: string,
  reason: "missing_outcome" | "invalid_outcome",
): ConsolidatedDuelResult {
  return ConsolidatedDuelResultSchema.parse({
    status: "unavailable",
    duelSessionId,
    reason,
  });
}

async function resolveVictoryRating({
  session,
  dependencies,
  minimumReward,
  logIncident,
}: {
  session: EndedDuelSession;
  dependencies: ResolveDuelResultDependencies;
  minimumReward: MinimumRatingReward;
  logIncident: (incident: DuelResultIncident) => void;
}) {
  try {
    const snapshot = dependencies.createSnapshot(session.finalState);
    // Always the human player: this branch only runs when P1 won (below).
    const evaluated = await dependencies.ratingEngine.evaluate(snapshot, HUMAN_PLAYER);
    if (evaluated.ok) {
      const parsed = RatingEvaluationSchema.safeParse(evaluated.value);
      if (parsed.success) {
        return {
          source: "rating_engine",
          grade: parsed.data.grade,
          reward: parsed.data.reward,
        } as const;
      }
      logIncident({
        code: "rating_engine_response_invalid",
        duelSessionId: session.duelSessionId,
        error: parsed.error,
      });
    } else {
      logIncident({
        code: "rating_engine_unavailable",
        duelSessionId: session.duelSessionId,
        error: evaluated.error,
      });
    }
  } catch (error) {
    logIncident({
      code: "rating_engine_unavailable",
      duelSessionId: session.duelSessionId,
      error,
    });
  }
  return {
    source: "minimum_fallback",
    grade: null,
    reward: minimumReward,
  } as const;
}

export async function resolveDuelResult(
  session: EndedDuelSession,
  dependencies: ResolveDuelResultDependencies,
): Promise<ConsolidatedDuelResult> {
  const cache = dependencies.cache ?? defaultCache;
  const cached = cache.get(session.duelSessionId);
  if (cached) return cached;

  const minimumReward = MinimumRatingRewardSchema.safeParse(dependencies.minimumReward);
  if (!minimumReward.success) {
    throw new DomainError(
      "minimum rating reward policy is invalid",
      "invalid_minimum_rating_reward",
      { issues: minimumReward.error.issues },
    );
  }

  const logIncident = dependencies.logIncident ?? defaultLogIncident;
  let outcomeResult;
  try {
    outcomeResult = dependencies.readOutcome(session.finalState);
  } catch (error) {
    logIncident({
      code: "duel_outcome_unavailable",
      duelSessionId: session.duelSessionId,
      error,
    });
    const result = unavailableResult(session.duelSessionId, "missing_outcome");
    cache.set(session.duelSessionId, result);
    return result;
  }
  if (!outcomeResult.ok) {
    logIncident({
      code: "duel_outcome_unavailable",
      duelSessionId: session.duelSessionId,
      error: outcomeResult.error,
    });
    const result = unavailableResult(session.duelSessionId, "missing_outcome");
    cache.set(session.duelSessionId, result);
    return result;
  }

  const outcome = DuelOutcomeSchema.safeParse(outcomeResult.value);
  if (!outcome.success) {
    logIncident({
      code: "duel_outcome_invalid",
      duelSessionId: session.duelSessionId,
      error: outcome.error,
    });
    const result = unavailableResult(session.duelSessionId, "invalid_outcome");
    cache.set(session.duelSessionId, result);
    return result;
  }

  const isVictory = outcome.data.status === "decisive" && outcome.data.winner === HUMAN_PLAYER;
  const rating = isVictory
    ? await resolveVictoryRating({
        session,
        dependencies,
        minimumReward: minimumReward.data,
        logIncident,
      })
    : null;
  const result = consolidateDuelResult({
    duelSessionId: session.duelSessionId,
    outcome: outcome.data,
    rating,
  });
  cache.set(session.duelSessionId, result);
  return result;
}

