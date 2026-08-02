import type { CardNumber } from "../card/types.ts";

export type CardRedemptionIntent = Readonly<{ redemptionId: string; playerId: string; password: string; expectedCardNumber: CardNumber; expectedStars: number; createdAt: string }>;
export type RedemptionEligibility =
  | Readonly<{ status: "ready"; priceStars: number; balanceStars: number }>
  | Readonly<{ status: "needs_confirmation"; priceStars: number; balanceStars: number; thresholdStars: number }>
  | Readonly<{ status: "blocked_insufficient"; priceStars: number; balanceStars: number; missingStars: number }>
  | Readonly<{ status: "blocked_unknown_balance"; priceStars: number }>;
export type CardRedemptionOutcome =
  | Readonly<{ status: "applied"; cardNumber: CardNumber; starsSpent: number; walletStars: number; cardQuantity: number; redeemedAt: string }>
  | Readonly<{ status: "already_applied"; cardNumber: CardNumber; starsSpent: number; walletStars: number; cardQuantity: number }>
  | Readonly<{ status: "insufficient_stars"; priceStars: number; balanceStars: number; missingStars: number }>
  | Readonly<{ status: "unknown_password"; expectedCardNumber: CardNumber }>
  | Readonly<{ status: "preview_mismatch"; authoritativeCardNumber: CardNumber; authoritativeStars: number }>
  | Readonly<{ status: "queued_offline"; redemptionId: string; queuedAt: string }>;
export type PendingCardRedemption = CardRedemptionIntent & Readonly<{ queuedAt: string; attempts: number }>;
export type RedemptionLedgerState = Readonly<{ balanceStars: number; appliedRedemptionIds: readonly string[] }>;
