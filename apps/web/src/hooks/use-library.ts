"use client";

import type { DomainError, LoadedLibrary } from "@yugioh/shared";
import { useEffect, useState } from "react";

import { createIndexedDbCollectionCache } from "../lib/collection/indexeddb-cache.ts";
import { loadCollection } from "../lib/collection/load-collection.ts";
import { createSupabaseCollectionRepository } from "../lib/collection/supabase-repository.ts";
import { getLibraryCatalog } from "../lib/library/catalog-library.ts";
import { loadLibrary } from "../lib/library/load-library.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";

type LoadOutcome =
  | Readonly<{ status: "ready"; loaded: LoadedLibrary }>
  | Readonly<{ status: "error"; error: DomainError }>;

/** What `useLibrary` reports (spec library/F01 §4 `EstadoLibrary`). */
export type LibraryState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; loaded: LoadedLibrary; reload: () => void }>
  | Readonly<{ status: "error"; error: DomainError; reload: () => void }>;

/**
 * Thin React adapter, same shape as `useCollection` (spec build-deck/F01,
 * Decision 5) -- no rule and no state-management library chosen here either
 * (library/F01, Decision 12 defers that choice to F03/F04, where a real
 * mutable draft -- search term, filters -- would justify one).
 *
 * Loads on mount and on every `reload()`. A reload started while a previous
 * load is still in flight lets the most recent call win: the effect's
 * cleanup marks the stale run so its result is discarded on arrival, instead
 * of racing to overwrite a newer index with an older one (spec library/F01
 * §6, "Recarregar enquanto um carregamento esta em curso").
 */
export function useLibrary(): LibraryState {
  const [outcome, setOutcome] = useState<LoadOutcome | undefined>(undefined);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let stale = false;

    async function run(): Promise<void> {
      const client = createSupabaseClient();
      const playerId = await getAuthenticatedPlayerId(client);

      const result = await loadLibrary({
        getCatalog: getLibraryCatalog,
        loadCollection: () =>
          loadCollection({
            playerId,
            repository: createSupabaseCollectionRepository(client),
            cache: createIndexedDbCollectionCache(),
            clock: { now: () => new Date() },
          }),
      });

      if (stale) {
        return;
      }
      setOutcome(
        result.ok
          ? { status: "ready", loaded: result.value }
          : { status: "error", error: result.error },
      );
    }

    setOutcome(undefined);
    void run();

    return () => {
      stale = true;
    };
  }, [requestId]);

  function reload(): void {
    setRequestId((id) => id + 1);
  }

  if (outcome === undefined) {
    return { status: "loading" };
  }
  return outcome.status === "ready"
    ? { status: "ready", loaded: outcome.loaded, reload }
    : { status: "error", error: outcome.error, reload };
}
