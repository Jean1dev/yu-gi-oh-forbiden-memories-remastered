"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActiveDeckVerification, Card, CardNumber } from "@yugioh/shared";
import { createIndexedDbActiveDeckCache } from "../lib/active-deck/cache.ts";
import { createSupabaseActiveDeckRepository } from "../lib/active-deck/supabase-repository.ts";
import { createDuelActiveDeckCache } from "../lib/free-duel/active-deck-cache.ts";
import { createDuelActiveDeckRepository } from "../lib/free-duel/active-deck-repository.ts";
import { verifyActiveDeck } from "../lib/free-duel/verify-active-deck.ts";
import { createSupabaseClient } from "../lib/supabase/client.ts";

export type VerificationState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "resolved"; verification: ActiveDeckVerification }>;

async function loadCatalogNumbers(): Promise<readonly CardNumber[] | undefined> {
  try {
    const response = await fetch("/api/free-duel/roster-source");
    if (!response.ok) return undefined;
    const payload = (await response.json()) as { cardNumbers?: readonly CardNumber[] };
    return payload.cardNumbers;
  } catch {
    return undefined;
  }
}

export function useActiveDeckVerification(playerId?: string) {
  const [state, setState] = useState<VerificationState>({ status: "loading" });
  const retry = useCallback(() => {
    setState({ status: "loading" });
    void (async () => {
      const numbers = await loadCatalogNumbers();
      let verification: ActiveDeckVerification;
      try {
        const client = createSupabaseClient();
        verification = await verifyActiveDeck({
          ...(playerId === undefined ? {} : { playerId }),
          repository: createDuelActiveDeckRepository(createSupabaseActiveDeckRepository(client)),
          cache: createDuelActiveDeckCache(createIndexedDbActiveDeckCache()),
          ...(numbers === undefined
            ? {}
            : {
                catalog: (cardNumber: CardNumber) =>
                  numbers.includes(cardNumber) ? ({ numero: cardNumber } as Card) : undefined,
              }),
        });
      } catch {
        verification = { status: "unavailable", hasValidDeck: false, reason: "load_failed" };
      }
      setState({ status: "resolved", verification });
    })();
  }, [playerId]);
  useEffect(retry, [retry]);
  return { state, retry };
}
