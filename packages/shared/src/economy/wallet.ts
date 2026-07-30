import type { CardNumber } from "../card/types.ts";

export type WalletBalance = Readonly<{
  playerId: string;
  stars: number;
}>;

export type LoadedWalletBalance =
  | Readonly<{ origin: "server"; stars: number; syncedAt: string }>
  | Readonly<{ origin: "cache"; stars: number; syncedAt: string }>;

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
