"use client";

import { enrichCollection, searchByName, withDeckQuantity } from "@yugioh/rules";
import type {
  ActiveDeckLookup,
  Card,
  CardNumber,
  CollectionItemWithDeck,
  CollectionOrigin,
  DomainError,
} from "@yugioh/shared";
import { useMemo, useState } from "react";

import { buildCatalogLookup } from "../lib/build-deck/catalog-lookup.ts";
import { useCollection } from "./use-collection.ts";

export type CollectionPanelState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "error"; error: DomainError }>
  | Readonly<{
      status: "ready";
      origin: CollectionOrigin;
      /** Whether the collection has zero owned cards, independent of the search term. */
      isEmpty: boolean;
      /** `allItems` filtered by `term` (spec build-deck/F04 §3, Decision 4: no debounce). */
      items: readonly CollectionItemWithDeck[];
      term: string;
      selectedCardNumber: CardNumber | undefined;
    }>;

export type CollectionPanelActions = Readonly<{
  setTerm: (term: string) => void;
  select: (cardNumber: CardNumber | undefined) => void;
}>;

/**
 * Thin adapter combining the loaded collection (F01's `useCollection`), the
 * card catalog the server component shipped, the deck-quantity lookup
 * (injected, spec build-deck/F04 Decision 3) and the local search
 * term/selection into what the panel renders.
 *
 * `useCollection` only resolves raw quantities, never an enriched collection,
 * so this hook calls `enrichCollection` itself before composing with the
 * deck quantity and applying the search term (spec build-deck/F04 §3, Fluxo
 * step 5-6).
 */
export function useCollectionPanel(
  catalogCards: readonly Card[],
  activeDeckLookup: ActiveDeckLookup,
): CollectionPanelState & CollectionPanelActions {
  const collectionState = useCollection();
  const [term, setTerm] = useState("");
  const [selectedCardNumber, setSelectedCardNumber] = useState<CardNumber | undefined>(undefined);

  const catalog = useMemo(() => buildCatalogLookup(catalogCards), [catalogCards]);

  const state: CollectionPanelState = useMemo(() => {
    if (collectionState.status === "loading") {
      return { status: "loading" };
    }
    if (collectionState.status === "error") {
      return { status: "error", error: collectionState.error };
    }
    const enriched = enrichCollection(collectionState.loaded.collection, catalog);
    const allItems = withDeckQuantity(enriched.items, activeDeckLookup);
    return {
      status: "ready",
      origin: collectionState.loaded.origin,
      isEmpty: allItems.length === 0,
      items: searchByName(allItems, term),
      term,
      selectedCardNumber,
    };
  }, [collectionState, catalog, activeDeckLookup, term, selectedCardNumber]);

  return { ...state, setTerm, select: setSelectedCardNumber };
}
