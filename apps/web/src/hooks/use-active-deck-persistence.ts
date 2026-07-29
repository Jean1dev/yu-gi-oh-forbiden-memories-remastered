"use client";

import {
  DomainError,
  type Collection,
  type DeckDraft,
  type SaveActiveDeckResult,
} from "@yugioh/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createIndexedDbActiveDeckCache,
  createIndexedDbPendingActiveDeckSaveQueue,
  writeActiveDeckCacheAndPendingSaveAtomically,
} from "../lib/active-deck/cache.ts";
import { loadActiveDeck } from "../lib/active-deck/load-active-deck.ts";
import { saveActiveDeck } from "../lib/active-deck/save-active-deck.ts";
import { createSupabaseActiveDeckRepository } from "../lib/active-deck/supabase-repository.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";

/**
 * What `useActiveDeckPersistence` reports for the initial load: the fetch in
 * flight, no row yet (`pending`, same F02 "Preparando seu deck inicial…" case
 * `build-deck/F05`'s `useActiveDeck` used to report), ready with the deck
 * (plus whether a version conflict was detected against another device), or
 * a load error.
 */
export type ActiveDeckPersistenceState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "ready"; activeDeck: Collection; conflictDetected: boolean }>
  | Readonly<{ status: "error"; error: DomainError }>;

/** What `save()` last resolved to, for `SaveDeckIndicator` to render. */
export type SaveActiveDeckStatus =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "saving" }>
  | Readonly<{ kind: "done"; result: SaveActiveDeckResult }>
  | Readonly<{ kind: "error"; error: DomainError }>;

export type UseActiveDeckPersistenceResult = Readonly<{
  state: ActiveDeckPersistenceState;
  saveStatus: SaveActiveDeckStatus;
  save(draft: DeckDraft, ownedCollection: Collection): Promise<void>;
}>;

/**
 * Resolves the active deck to seed the draft and exposes `save()` (spec
 * build-deck/F07 §3). Supersedes `build-deck/F05`'s `useActiveDeck` as the
 * composition root's data source (spec Seção 2, `page.tsx`: "Inicializa
 * useDeckAtivo no lugar da leitura direta de F02 usada por F05") — this hook
 * generalizes that plain RLS read with the cache fallback and conflict
 * detection `loadActiveDeck` adds, so `use-active-deck.ts` has no remaining
 * caller and was removed rather than kept as a second, narrower read path.
 */
export function useActiveDeckPersistence(): UseActiveDeckPersistenceResult {
  const [state, setState] = useState<ActiveDeckPersistenceState>({ status: "loading" });
  const [saveStatus, setSaveStatus] = useState<SaveActiveDeckStatus>({ kind: "idle" });
  const playerIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      const client = createSupabaseClient();
      const playerId = await getAuthenticatedPlayerId(client);
      if (playerId === undefined) {
        if (!cancelled) {
          setState({ status: "error", error: new DomainError("No authenticated session.", "session_missing") });
        }
        return;
      }
      playerIdRef.current = playerId;

      const result = await loadActiveDeck(playerId, {
        activeDeckRepository: createSupabaseActiveDeckRepository(client),
        activeDeckCache: createIndexedDbActiveDeckCache(),
        pendingSaveQueue: createIndexedDbPendingActiveDeckSaveQueue(),
      });

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setState(
          result.error.code === "active_deck_pending"
            ? { status: "pending" }
            : { status: "error", error: result.error },
        );
        return;
      }

      setState({
        status: "ready",
        activeDeck: result.value.composition,
        conflictDetected: result.value.conflictDetected,
      });
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (draft: DeckDraft, ownedCollection: Collection): Promise<void> => {
    const playerId = playerIdRef.current;
    if (playerId === undefined) {
      return;
    }

    setSaveStatus({ kind: "saving" });
    const client = createSupabaseClient();
    const result = await saveActiveDeck(draft, ownedCollection, {
      playerId,
      activeDeckRepository: createSupabaseActiveDeckRepository(client),
      activeDeckCache: createIndexedDbActiveDeckCache(),
      pendingSaveQueue: createIndexedDbPendingActiveDeckSaveQueue(),
      clock: { now: () => new Date() },
      writeOfflineSave: writeActiveDeckCacheAndPendingSaveAtomically,
    });

    setSaveStatus(result.ok ? { kind: "done", result: result.value } : { kind: "error", error: result.error });
  }, []);

  return { state, saveStatus, save };
}
