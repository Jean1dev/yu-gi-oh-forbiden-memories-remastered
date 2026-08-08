import type { DomainError } from "../errors.ts";
import type { Result } from "../result.ts";
import type { DropTierId } from "../duelist/types.ts";
import type { DUEL_GRADES } from "./constants.ts";
import type { PlayerId } from "./player.ts";
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

/**
 * One of the ten Forbidden Memories duel grades (`DUEL_GRADES`).
 *
 * Was an opaque `string` while the Rating Engine did not exist and
 * `free-duel/F05` had nothing to interpret. Narrowing it does not change F05 —
 * it still only displays the grade — but it does make the grade→reward table of
 * `rating-engine/F03` exhaustive by construction.
 */
export type DuelGrade = (typeof DUEL_GRADES)[number];

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

/**
 * The port `free-duel/F05` calls on a victory.
 *
 * Takes the player being graded, not just the snapshot: the counters that feed
 * the formula are indexed by player (`DuelState.stats`), so the snapshot alone
 * does not say whose duel is being evaluated. The return type is the concrete
 * evaluation rather than `unknown` now that an implementation exists — F05
 * already validates it with `RatingEvaluationSchema` either way.
 */
export type RatingEngine = Readonly<{
  evaluate(snapshot: Snapshot, player: PlayerId): Promise<Result<RatingEvaluation, DomainError>>;
}>;

