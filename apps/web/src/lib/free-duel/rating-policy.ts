import {
  DomainError,
  err,
  ok,
  type DuelState,
  type MinimumRatingReward,
  type RatingEngine,
  type ReadDuelOutcome,
} from "@yugioh/shared";

export const MINIMUM_RATING_REWARD: MinimumRatingReward = {
  stars: 0,
  dropTier: "common",
};

export const readDuelOutcome: ReadDuelOutcome = (state: DuelState) =>
  state.outcome === undefined
    ? err(new DomainError("The duel has not ended yet.", "duel_outcome_missing"))
    : ok(state.outcome);

export const unavailableRatingEngine: RatingEngine = {
  evaluate: async () =>
    err(new DomainError("Rating Engine is not available yet.", "rating_engine_unavailable")),
};
