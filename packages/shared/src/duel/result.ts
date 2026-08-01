import type { DomainError } from "../errors.ts";
import type { Result } from "../result.ts";
import type { DropTierId } from "../duelist/types.ts";
import type { DuelSession } from "./orchestration.ts";
import type { Snapshot } from "./snapshot.ts";
import type { DuelState } from "./types.ts";
import type { DecisiveDuelEndReason } from "./outcome.ts";

/**
 * Re-exported from `./outcome.ts`, where they live so that `DuelState` can
 * carry a `DuelOutcome` without this module and `./types.ts` importing each
 * other. Consumers keep importing them from `@yugioh/shared` either way.
 */
export type { DecisiveDuelEndReason, DuelEndReason, DuelOutcome } from "./outcome.ts";

export type DuelGrade = string;

export type RatingReward = Readonly<{
  stars: number;
  dropTier: DropTierId;
}>;

export type MinimumRatingReward = RatingReward;

export type RatingEvaluation = Readonly<{
  grade: DuelGrade;
  reward: RatingReward;
}>;

export type ConsolidatedRating =
  | Readonly<{
      source: "rating_engine";
      grade: DuelGrade;
      reward: RatingReward;
    }>
  | Readonly<{
      source: "minimum_fallback";
      grade: null;
      reward: MinimumRatingReward;
    }>;

export type DuelResultUnavailableReason = "missing_outcome" | "invalid_outcome";

export type ConsolidatedDuelResult =
  | Readonly<{
      status: "victory";
      duelSessionId: string;
      reason: DecisiveDuelEndReason;
      rating: ConsolidatedRating;
    }>
  | Readonly<{
      status: "defeat";
      duelSessionId: string;
      reason: DecisiveDuelEndReason;
    }>
  | Readonly<{
      status: "draw";
      duelSessionId: string;
      reason: "draw";
    }>
  | Readonly<{
      status: "unavailable";
      duelSessionId: string;
      reason: DuelResultUnavailableReason;
    }>;

export type EndedDuelSession = Extract<DuelSession, { status: "ended" }>;

export type ReadDuelOutcome = (state: DuelState) => Result<unknown, DomainError>;
export type CreateDuelSnapshot = (state: DuelState) => Snapshot;

export type RatingEngine = Readonly<{
  evaluate(snapshot: Snapshot): Promise<Result<unknown, DomainError>>;
}>;

