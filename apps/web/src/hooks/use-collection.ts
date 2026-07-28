"use client";

import type { DomainError, LoadedCollection } from "@yugioh/shared";
import { useEffect, useState } from "react";

import { createIndexedDbCollectionCache } from "../lib/collection/indexeddb-cache.ts";
import { loadCollection } from "../lib/collection/load-collection.ts";
import { createSupabaseCollectionRepository } from "../lib/collection/supabase-repository.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";

/** What `useCollection` reports: loading, ready with the result, or a load error (spec build-deck/F01 §4 `EstadoColecao`). */
export type CollectionState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; loaded: LoadedCollection }>
  | Readonly<{ status: "error"; error: DomainError }>;

/**
 * Thin React adapter: triggers the load and reflects loading/ready/error. No
 * rule lives here, and no state-management library is chosen for it (spec
 * build-deck/F01, Decision 5) — that decision belongs to F05, where a real
 * mutable draft (the deck in edition) justifies it.
 */
export function useCollection(): CollectionState {
  const [state, setState] = useState<CollectionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      const client = createSupabaseClient();
      const playerId = await getAuthenticatedPlayerId(client);
      const result = await loadCollection({
        playerId,
        repository: createSupabaseCollectionRepository(client),
        cache: createIndexedDbCollectionCache(),
        clock: { now: () => new Date() },
      });

      if (cancelled) {
        return;
      }
      setState(result.ok ? { status: "ready", loaded: result.value } : { status: "error", error: result.error });
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
