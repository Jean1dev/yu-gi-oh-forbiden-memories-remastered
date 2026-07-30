import { z } from "zod";

import { PlayerIdSchema } from "./schema.ts";
import type {
  ConsolidatedDuelResult,
  DuelOutcome,
  MinimumRatingReward,
  RatingEvaluation,
  RatingReward,
} from "./result.ts";

export const DecisiveDuelEndReasonSchema = z.enum(["lp_zerado", "deck_out", "rendicao"]);
export const DuelEndReasonSchema = z.enum(["lp_zerado", "deck_out", "rendicao", "empate"]);

const DecisiveDuelOutcomeSchema = z
  .strictObject({
    status: z.literal("decisive"),
    winner: PlayerIdSchema,
    loser: PlayerIdSchema,
    reason: DecisiveDuelEndReasonSchema,
  })
  .refine(({ winner, loser }) => winner !== loser, {
    message: "winner and loser must be different players",
  });

const DrawDuelOutcomeSchema = z.strictObject({
  status: z.literal("draw"),
  winner: z.null(),
  loser: z.null(),
  reason: z.literal("empate"),
});

export const DuelOutcomeSchema = z.union([DecisiveDuelOutcomeSchema, DrawDuelOutcomeSchema]);

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
    reason: z.literal("empate"),
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

