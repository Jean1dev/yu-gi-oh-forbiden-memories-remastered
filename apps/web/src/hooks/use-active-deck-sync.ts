"use client";

import type { SyncActiveDeckSummary } from "@yugioh/shared";
import { useEffect, useState } from "react";

import {
  createIndexedDbActiveDeckCache,
  createIndexedDbPendingActiveDeckSaveQueue,
} from "../lib/active-deck/cache.ts";
import { syncPendingActiveDeckSave } from "../lib/active-deck/sync-pending-active-deck-save.ts";
import { createSupabaseActiveDeckRepository } from "../lib/active-deck/supabase-repository.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";
import { log } from "../lib/logging.ts";

/**
 * Drains the pending active-deck save whenever the browser regains
 * connectivity (spec build-deck/F07 §3, steps 6-10), same pattern
 * `useRewardSync` (build-deck/F03) already established for its own offline
 * queue. Returns the last sync outcome (`undefined` until the first run) so
 * `SaveDeckIndicator` can show "Deck sincronizado" once a queued offline save
 * finally lands, instead of a fire-and-forget `void` like `useRewardSync`.
 */
export function useActiveDeckSync(): SyncActiveDeckSummary | undefined {
  const [lastSummary, setLastSummary] = useState<SyncActiveDeckSummary | undefined>(undefined);

  useEffect(() => {
    async function runSync(): Promise<void> {
      const client = createSupabaseClient();
      const playerId = await getAuthenticatedPlayerId(client);
      if (playerId === undefined) {
        return;
      }

      const summary = await syncPendingActiveDeckSave(playerId, {
        activeDeckRepository: createSupabaseActiveDeckRepository(client),
        activeDeckCache: createIndexedDbActiveDeckCache(),
        pendingSaveQueue: createIndexedDbPendingActiveDeckSaveQueue(),
      });

      if (summary.status === "network_failure" || summary.status === "session_expired") {
        log("warn", "active_deck_sync_pending", { playerId, status: summary.status });
      }
      if (summary.status !== "no_pending") {
        setLastSummary(summary);
      }
    }

    function handleOnline(): void {
      void runSync();
    }

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return lastSummary;
}
