"use client";

import { useEffect } from "react";

import { loadCatalogAndPool } from "../lib/initial-deck/catalog-adapter.ts";
import { log } from "../lib/logging.ts";
import { createIndexedDbRewardQueue } from "../lib/reward/offline-queue.ts";
import { createSupabaseRewardRepository } from "../lib/reward/supabase-repository.ts";
import { syncRewardQueue } from "../lib/reward/sync-reward-queue.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";

/**
 * Drains the offline reward queue whenever the browser regains connectivity
 * (spec build-deck/F03 §3, step 11). A thin React adapter with no rule of its
 * own, the same shape as `useCollection` (spec build-deck/F01, Decision 5).
 * Reuses `loadCatalogAndPool` from build-deck/F02 for the catalog lookup
 * instead of loading it a second way — the pool half of its result is simply
 * unused here.
 */
export function useRewardSync(): void {
  useEffect(() => {
    async function runSync(): Promise<void> {
      const client = createSupabaseClient();
      const playerId = await getAuthenticatedPlayerId(client);
      if (playerId === undefined) {
        return;
      }

      const catalogResult = await loadCatalogAndPool();
      if (!catalogResult.ok) {
        log("warn", "reward_sync_catalog_unavailable", { playerId, cause: catalogResult.error.message });
        return;
      }

      await syncRewardQueue({
        playerId,
        catalog: catalogResult.value.catalog,
        rewardRepository: createSupabaseRewardRepository(client),
        rewardQueue: createIndexedDbRewardQueue(),
      });
    }

    function handleOnline(): void {
      void runSync();
    }

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}
