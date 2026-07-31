import { z } from "zod";
import { CardNumberSchema } from "../card/schema.ts";

export const CardRedemptionIntentSchema = z.strictObject({
  redemptionId: z.string().uuid(), playerId: z.string().uuid(), password: z.string().min(1),
  expectedCardNumber: CardNumberSchema, expectedStars: z.number().int().min(0), createdAt: z.string().datetime(),
});
export const PendingCardRedemptionSchema = CardRedemptionIntentSchema.extend({ queuedAt: z.string().datetime(), attempts: z.number().int().min(0) });
export const RedeemCardResponseSchema = z.strictObject({
  status: z.enum(["applied", "already_applied", "insufficient_stars", "unknown_password", "preview_mismatch"]),
  card_numero: CardNumberSchema.nullable(), stars_spent: z.number().int().min(0).nullable(), wallet_stars: z.number().int().min(0).nullable(),
  card_quantity: z.number().int().min(0).nullable(), dataset_version: z.string().nullable(), redeemed_at: z.string().datetime().nullable(),
});
export type RedeemCardResponse = z.infer<typeof RedeemCardResponseSchema>;
