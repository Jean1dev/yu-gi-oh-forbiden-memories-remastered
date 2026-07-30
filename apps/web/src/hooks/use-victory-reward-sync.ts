"use client";

import type { CardCatalogLookup } from "@yugioh/shared";
import { useEffect } from "react";

import { createIndexedDbVictoryRewardQueue } from "../lib/reward/victory-reward-queue.ts";
import { createSupabaseVictoryRewardRepository } from "../lib/reward/victory-reward-repository.ts";
import { syncVictoryRewardQueue } from "../lib/reward/sync-victory-reward-queue.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";

export function useVictoryRewardSync(catalog: CardCatalogLookup | undefined): void {
  useEffect(() => {
    async function run(): Promise<void> {
      if (catalog === undefined) return;
      const client = createSupabaseClient();
      const playerId = await getAuthenticatedPlayerId(client);
      if (playerId === undefined) return;
      await syncVictoryRewardQueue({
        playerId,
        catalog,
        repository: createSupabaseVictoryRewardRepository(client),
        queue: createIndexedDbVictoryRewardQueue(),
      });
    }
    const handleOnline = (): void => void run();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [catalog]);
}
