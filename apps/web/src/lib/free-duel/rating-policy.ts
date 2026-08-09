import { evaluateDuel } from "@yugioh/rules";
import {
  DomainError,
  err,
  ok,
  type DuelState,
  type MinimumRatingReward,
  type RatingEngine,
  type ReadDuelOutcome,
} from "@yugioh/shared";

/**
 * What a victory pays when the Rating Engine itself fails, so a system fault
 * never punishes the player with nothing while still not inventing a grade
 * (`free-duel/F05`).
 *
 * No longer the normal outcome: since `rating-engine/F02`, the happy path
 * produces a real grade and this is only reached on an internal error.
 */
export const MINIMUM_RATING_REWARD: MinimumRatingReward = {
  stars: 0,
  dropTier: "common",
};

export const readDuelOutcome: ReadDuelOutcome = (state: DuelState) =>
  state.outcome === undefined
    ? err(new DomainError("The duel has not ended yet.", "duel_outcome_missing"))
    : ok(state.outcome);

/**
 * The real Rating Engine (`rating-engine` F01–F03), adapted to the async port
 * `free-duel/F05` calls.
 *
 * `evaluateDuel` is pure and synchronous; the port is a promise because it was
 * shaped when the engine might have lived behind the network.
 */
export const ratingEngine: RatingEngine = {
  evaluate: async (snapshot, player) => evaluateDuel(snapshot, player),
};

/**
 * The pre-`rating-engine` stand-in that always failed, kept only so the
 * minimum-fallback path of `free-duel/F05` stays testable without faking an
 * internal error.
 */
export const unavailableRatingEngine: RatingEngine = {
  evaluate: async () =>
    err(new DomainError("Rating Engine is not available yet.", "rating_engine_unavailable")),
};
