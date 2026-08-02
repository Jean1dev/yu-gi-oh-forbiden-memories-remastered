import { DomainError, type LoadedWalletBalance } from "@yugioh/shared";
import { create } from "zustand";

import { createIndexedDbVictoryRewardQueue } from "../lib/reward/victory-reward-queue.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";
import { log } from "../lib/logging.ts";
import { createSupabaseAppliedRewardsRepository } from "../lib/wallet/applied-rewards-repository.ts";
import { createIndexedDbWalletCache } from "../lib/wallet/indexeddb-cache.ts";
import { loadWalletBalance } from "../lib/wallet/load-wallet.ts";
import { createSupabaseWalletRepository } from "../lib/wallet/supabase-repository.ts";

export type WalletBalanceState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; loaded: LoadedWalletBalance }>
  | Readonly<{ status: "unavailable"; error: DomainError }>;

export type WalletStore = Readonly<{
  state: WalletBalanceState;
  load(): Promise<void>;
  setAuthoritativeBalance(stars: number): void;
}>;

let loadedPlayerId: string | undefined;

export const useWalletStore = create<WalletStore>((set, get) => ({
  state: { status: "idle" },

  async load() {
    if (get().state.status !== "idle") return;
    set({ state: { status: "loading" } });

    try {
      const client = createSupabaseClient();
      const playerId = await getAuthenticatedPlayerId(client);
      const result = await loadWalletBalance({
        playerId,
        repository: createSupabaseWalletRepository(client),
        cache: createIndexedDbWalletCache(),
        queue: createIndexedDbVictoryRewardQueue(),
        appliedRewards: createSupabaseAppliedRewardsRepository(client),
        clock: { now: () => new Date() },
      });
      loadedPlayerId = result.ok ? playerId : undefined;
      set({
        state: result.ok
          ? { status: "ready", loaded: result.value }
          : { status: "unavailable", error: result.error },
      });
    } catch (cause) {
      loadedPlayerId = undefined;
      set({
        state: {
          status: "unavailable",
          error: new DomainError("Wallet unavailable.", "wallet_unavailable", { cause: String(cause) }),
        },
      });
    }
  },

  setAuthoritativeBalance(stars) {
    if (!Number.isInteger(stars) || stars < 0) {
      log("warn", "authoritative_wallet_balance_invalid", { stars });
      return;
    }
    const current = get().state;
    if (current.status !== "ready" || loadedPlayerId === undefined) {
      log("warn", "authoritative_wallet_balance_without_loaded_wallet", { stars });
      return;
    }

    const syncedAt = new Date().toISOString();
    const loaded: LoadedWalletBalance = {
      origin: "server",
      stars,
      effectiveStars: stars,
      pendingStars: 0,
      pendingDuelIds: [],
      syncedAt,
    };
    set({ state: { status: "ready", loaded } });
    void createIndexedDbWalletCache()
      .saveSnapshot({ playerId: loadedPlayerId, stars, syncedAt })
      .catch((error: unknown) => log("warn", "authoritative_wallet_cache_write_failed", { error: String(error) }));
  },
}));
