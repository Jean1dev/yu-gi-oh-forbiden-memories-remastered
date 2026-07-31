import { z } from "zod";

import { CardNumberSchema } from "../card/schema.ts";

export const WalletBalanceSchema = z.strictObject({
  playerId: z.string().min(1),
  stars: z.number().int().min(0),
});

export const VictoryRewardEventSchema = z.strictObject({
  playerId: z.string().min(1),
  duelId: z.string().min(1),
  cardNumber: CardNumberSchema,
  stars: z.number().int().min(0),
});

export const PendingVictoryRewardSchema = z.strictObject({
  duelId: z.string().min(1),
  playerId: z.string().min(1),
  cardNumber: CardNumberSchema,
  stars: z.number().int().min(0),
  queuedAt: z.string().min(1),
});

export const ApplyVictoryRewardResponseSchema = z.strictObject({
  applied: z.boolean(),
  card_quantity: z.number().int().min(0),
  wallet_stars: z.number().int().min(0),
});

export type ApplyVictoryRewardResponse = z.infer<typeof ApplyVictoryRewardResponseSchema>;

export const EnsureWalletResponseSchema = z.strictObject({
  stars: z.number().int().min(0),
  created_now: z.boolean(),
});

export type EnsureWalletResponse = z.infer<typeof EnsureWalletResponseSchema>;
