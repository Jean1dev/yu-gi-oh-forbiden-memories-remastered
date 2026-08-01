import { z } from "zod";

import { DecisiveDuelEndReasonSchema, DuelOutcomeSchema } from "./schema.ts";
import type {
  ConsolidatedDuelResult,
  DuelOutcome,
  MinimumRatingReward,
  RatingEvaluation,
  RatingReward,
} from "./result.ts";

/**
 * Re-exported from `./schema.ts`, where they had to move so that
 * `DuelStateSchema` can validate `DuelState.outcome` (F12) without the two
 * modules importing each other. Consumers keep their import path unchanged.
 */
export {
  DecisiveDuelEndReasonSchema,
  DuelEndReasonSchema,
  DuelOutcomeSchema,
} from "./schema.ts";

export const RatingRewardSchema = z.strictObject({
  stars: z.number().int().nonnegative(),
  dropTier: z.string().trim().min(1),
});

export const MinimumRatingRewardSchema = RatingRewardSchema;

export const RatingEvaluationSchema = z.strictObject({
  grade: z.string().trim().min(1),
  reward: RatingRewardSchema,
});

const ConsolidatedRatingSchema = z.discriminatedUnion("source", [
  z.strictObject({
    source: z.literal("rating_engine"),
    grade: z.string().trim().min(1),
    reward: RatingRewardSchema,
  }),
  z.strictObject({
    source: z.literal("minimum_fallback"),
    grade: z.null(),
    reward: MinimumRatingRewardSchema,
  }),
]);

export const ConsolidatedDuelResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("victory"),
    duelSessionId: z.string().min(1),
    reason: DecisiveDuelEndReasonSchema,
    rating: ConsolidatedRatingSchema,
  }),
  z.strictObject({
    status: z.literal("defeat"),
    duelSessionId: z.string().min(1),
    reason: DecisiveDuelEndReasonSchema,
  }),
  z.strictObject({
    status: z.literal("draw"),
    duelSessionId: z.string().min(1),
    reason: z.literal("draw"),
  }),
  z.strictObject({
    status: z.literal("unavailable"),
    duelSessionId: z.string().min(1),
    reason: z.enum(["missing_outcome", "invalid_outcome"]),
  }),
]);

const _outcomeSchemaMatchesType: DuelOutcome = {} as z.infer<typeof DuelOutcomeSchema>;
void _outcomeSchemaMatchesType;
const _rewardSchemaMatchesType: RatingReward = {} as z.infer<typeof RatingRewardSchema>;
void _rewardSchemaMatchesType;
const _minimumSchemaMatchesType: MinimumRatingReward = {} as z.infer<
  typeof MinimumRatingRewardSchema
>;
void _minimumSchemaMatchesType;
const _evaluationSchemaMatchesType: RatingEvaluation = {} as z.infer<
  typeof RatingEvaluationSchema
>;
void _evaluationSchemaMatchesType;
const _resultSchemaMatchesType: ConsolidatedDuelResult = {} as z.infer<
  typeof ConsolidatedDuelResultSchema
>;
void _resultSchemaMatchesType;

