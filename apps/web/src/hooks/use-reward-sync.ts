"use client";

import type { CardCatalogLookup } from "@yugioh/shared";
import { useEffect } from "react";

import { log } from "../lib/logging.ts";
import { createIndexedDbRewardQueue } from "../lib/reward/offline-queue.ts";
import { createSupabaseRewardRepository } from "../lib/reward/supabase-repository.ts";
import { syncRewardQueue } from "../lib/reward/sync-reward-queue.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";

/**
 * Drains the offline reward queue whenever the browser regains connectivity
 * (spec build-deck/F03 §3, step 11). A thin React adapter with no rule of its
 * own, the same shape as `useCollection` (spec build-deck/F01, Decision 5).
 *
 * The catalog is **injected** rather than loaded here. It used to call
 * `loadCatalogAndPool` (build-deck/F02) directly, which reads the filesystem —
 * inside a `"use client"` module that would put `node:fs` in the browser
 * bundle. The screen that mounts this hook already receives the catalog from
 * its server component, so it passes the same lookup down, exactly as
 * `useLibrary` does. `undefined` means the server could not load it: the queue
 * is left untouched, since a reward cannot be validated without the catalog.
 */
export function useRewardSync(catalog: CardCatalogLookup | undefined): void {
  useEffect(() => {
    async function runSync(): Promise<void> {
      const client = createSupabaseClient();
      const playerId = await getAuthenticatedPlayerId(client);
      if (playerId === undefined) {
        return;
      }

      if (catalog === undefined) {
        log("warn", "reward_sync_catalog_unavailable", { playerId });
        return;
      }

      await syncRewardQueue({
        playerId,
        catalog,
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
  }, [catalog]);
}
