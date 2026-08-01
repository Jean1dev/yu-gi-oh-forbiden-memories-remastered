import type { CardNumber } from "../card/types.ts";

export type WalletBalance = Readonly<{
  playerId: string;
  stars: number;
}>;

/** Output of `reconcileWalletBalance` (`@yugioh/rules`): persisted balance plus queued credits not yet confirmed in `reward_ledger`. */
export type ReconciledWalletBalance = Readonly<{
  persistedStars: number;
  pendingStars: number;
  effectiveStars: number;
  pendingDuelIds: readonly string[];
}>;

export type LoadedWalletBalance =
  | Readonly<{
      origin: "server";
      stars: number;
      effectiveStars: number;
      pendingStars: number;
      pendingDuelIds: readonly string[];
      syncedAt: string;
    }>
  | Readonly<{
      origin: "cache";
      stars: number;
      effectiveStars: number;
      pendingStars: number;
      pendingDuelIds: readonly string[];
      syncedAt: string;
    }>;

export type VictoryRewardEvent = Readonly<{
  playerId: string;
  duelId: string;
  cardNumber: CardNumber;
  stars: number;
}>;

export type VictoryRewardResult =
  | Readonly<{ status: "applied"; cardQuantity: number; walletStars: number }>
  | Readonly<{
      status: "applied_offline";
      localCardQuantity: number;
      localWalletStars: number;
    }>
  | Readonly<{
      status: "already_applied";
      cardQuantity?: number;
      walletStars?: number;
    }>;

export type PendingVictoryReward = Readonly<{
  duelId: string;
  playerId: string;
  cardNumber: CardNumber;
  stars: number;
  queuedAt: string;
}>;
