"use client";

import { DomainError, type Collection } from "@yugioh/shared";
import { useEffect, useState } from "react";

import { createSupabaseInitialDeckRepository } from "../lib/initial-deck/supabase-repository.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";

/**
 * What `useActiveDeck` reports: the initial fetch in flight, the row not
 * created yet (`pending`, shows F02's "Preparando seu deck inicial…" instead
 * of a generic spinner), ready with the deck, or a load error.
 */
export type ActiveDeckState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "ready"; activeDeck: Collection }>
  | Readonly<{ status: "error"; error: DomainError }>;

/**
 * Resolves the active deck to seed the draft (spec build-deck/F05 §3, Fluxo
 * step 1 — "leitura equivalente de active_decks"). Reads through
 * `createSupabaseInitialDeckRepository(...).readExisting` (build-deck/F02),
 * already RLS-safe with the ordinary authenticated client — no service-role
 * client here. `ensureDuelEntry` (F02's full guard, which also *creates* a
 * missing deck) needs a service-role client and must run from server-only
 * code; this project has no server-side session/cookie plumbing yet for a
 * Server Component or Action to trust a caller-supplied `playerId` without
 * reopening an IDOR hole, so wiring that guard end-to-end is left as a
 * pending cross-feature item (see the F05 implementation report) rather than
 * solved by this hook. In the normal flow every account already has an active
 * deck from signup, so the `pending` branch below is the rare/edge path, not
 * the common one.
 */
export function useActiveDeck(): ActiveDeckState {
  const [state, setState] = useState<ActiveDeckState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      const client = createSupabaseClient();
      const playerId = await getAuthenticatedPlayerId(client);
      if (playerId === undefined) {
        if (!cancelled) {
          setState({
            status: "error",
            error: new DomainError("No authenticated session.", "session_missing"),
          });
        }
        return;
      }

      const result = await createSupabaseInitialDeckRepository(client).readExisting(playerId);
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setState({ status: "error", error: result.error });
        return;
      }

      setState(result.value === undefined ? { status: "pending" } : { status: "ready", activeDeck: result.value });
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
