import type { DomainError } from "../errors.ts";
import type { Result } from "../result.ts";
import type { DropTierId } from "../duelist/types.ts";
import type { DuelSession } from "./orchestration.ts";
import type { Snapshot } from "./snapshot.ts";
import type { DuelState } from "./types.ts";
import type { PlayerId } from "./player.ts";

export type DecisiveDuelEndReason = "lp_zerado" | "deck_out" | "rendicao";
export type DuelEndReason = DecisiveDuelEndReason | "empate";

export type DuelOutcome =
  | Readonly<{
      status: "decisive";
      winner: PlayerId;
      loser: PlayerId;
      reason: DecisiveDuelEndReason;
    }>
  | Readonly<{
      status: "draw";
      winner: null;
      loser: null;
      reason: "empate";
    }>;

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
      reason: "empate";
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

