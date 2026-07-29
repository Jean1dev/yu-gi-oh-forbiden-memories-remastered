"use client";

import { createActiveDeckLookupFromDraft, draftDivergesFromActiveDeck, totalCardsInDraft } from "@yugioh/rules";
import type { ActiveDeckLookup, CardNumber, DeckDraft, DomainError } from "@yugioh/shared";
import { useMemo } from "react";

import { useDeckDraftStore } from "../stores/deck-draft-store.ts";
import { useCollection } from "./use-collection.ts";

export type UseDeckDraftResult = Readonly<{
  draft: DeckDraft;
  total: number;
  lastBlock: DomainError | undefined;
  /** Memoized by `draft` — feeds F04's `usePainelColecao` in place of the neutral fallback. */
  activeDeckLookup: ActiveDeckLookup;
  hasUnsavedChanges: boolean;
  /** `false` while F01's collection has not resolved yet — the UI disables "＋" instead of calling `addCard` (spec build-deck/F05 §6). */
  canAddCard: boolean;
  /** Injects the player's owned collection (F01) internally; a no-op while it is not ready. */
  addCard(cardNumber: CardNumber): void;
  removeCard(cardNumber: CardNumber): void;
}>;

/**
 * Thin adapter over `useDeckDraftStore`: derives the values F04's panel and
 * the editor UI need (total, active-deck lookup, unsaved-changes flag)
 * without either duplicating the store's state elsewhere (spec build-deck/F05
 * §3, §4).
 */
export function useDeckDraft(): UseDeckDraftResult {
  const draft = useDeckDraftStore((state) => state.draft);
  const originalActiveDeck = useDeckDraftStore((state) => state.originalActiveDeck);
  const lastBlock = useDeckDraftStore((state) => state.lastBlock);
  const storeAddCard = useDeckDraftStore((state) => state.addCard);
  const storeRemoveCard = useDeckDraftStore((state) => state.removeCard);
  const collectionState = useCollection();

  const activeDeckLookup = useMemo(() => createActiveDeckLookupFromDraft(draft), [draft]);
  const total = useMemo(() => totalCardsInDraft(draft), [draft]);
  const hasUnsavedChanges = useMemo(
    () => draftDivergesFromActiveDeck(draft, originalActiveDeck),
    [draft, originalActiveDeck],
  );

  function addCard(cardNumber: CardNumber): void {
    if (collectionState.status !== "ready") {
      return;
    }
    storeAddCard(cardNumber, collectionState.loaded.collection);
  }

  return {
    draft,
    total,
    lastBlock,
    activeDeckLookup,
    hasUnsavedChanges,
    canAddCard: collectionState.status === "ready",
    addCard,
    removeCard: storeRemoveCard,
  };
}
