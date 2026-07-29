"use client";

import type { Card } from "@yugioh/shared";
import { useEffect, useMemo, useRef } from "react";

import { BlockMessage } from "../../components/build-deck/block-message.tsx";
import { CollectionFailure } from "../../components/build-deck/collection-failure.tsx";
import { CollectionPanel } from "../../components/build-deck/collection-panel.tsx";
import { DeckEditor } from "../../components/build-deck/deck-editor.tsx";
import { DeckValidationSummary } from "../../components/build-deck/deck-validation-summary.tsx";
import { EmptyCollectionState } from "../../components/build-deck/empty-collection-state.tsx";
import { BUILD_DECK_MESSAGES } from "../../components/build-deck/messages.ts";
import { PanelSkeleton } from "../../components/build-deck/panel-skeleton.tsx";
import { SaveDeckIndicator } from "../../components/build-deck/save-deck-indicator.tsx";
import { useActiveDeckPersistence } from "../../hooks/use-active-deck-persistence.ts";
import { useActiveDeckSync } from "../../hooks/use-active-deck-sync.ts";
import { useCollection } from "../../hooks/use-collection.ts";
import { useCollectionPanel } from "../../hooks/use-collection-panel.ts";
import { useDeckDraft } from "../../hooks/use-deck-draft.ts";
import { useDeckValidation } from "../../hooks/use-deck-validation.ts";
import { useUnsavedChangesWarning } from "../../hooks/use-unsaved-changes-warning.ts";
import { buildCatalogLookup } from "../../lib/build-deck/catalog-lookup.ts";
import { useDeckDraftStore } from "../../stores/deck-draft-store.ts";

/** The catalog, resolved server-side in `page.tsx` via `loadCatalogFromDisk` (fs access is server-only). */
export type CatalogResult =
  | Readonly<{ status: "ok"; cards: readonly Card[] }>
  | Readonly<{ status: "error" }>;

export type BuildDeckClientProps = Readonly<{
  catalogResult: CatalogResult;
}>;

const EMPTY_CARDS: readonly Card[] = [];

/**
 * The state machine driving `/build-deck`: skeleton, failure, empty
 * collection, or the ready panel plus the deck-in-edition editor
 * (build-deck/F05), its live validation summary (build-deck/F06) and the
 * save/persist indicator (build-deck/F07). Owns the composition root for F04
 * (`useCollectionPanel`), F05 (`useDeckDraft`/`useUnsavedChangesWarning`), F06
 * (`useDeckValidation`) and F07 (`useActiveDeckPersistence`/
 * `useActiveDeckSync`): the spec's Seção 2 names `page.tsx` as the wiring
 * point, but `page.tsx` in this codebase is a server-only component (it loads
 * the catalog via `fs`) — every client hook already lived here since F04, so
 * each new feature's wiring joins it here too instead of splitting the
 * composition root across multiple files. `useActiveDeckPersistence`
 * supersedes F05's plain `useActiveDeck` as the initial-load source (spec
 * build-deck/F07 Seção 2), so this is the only place that changes shape for
 * F05/F06 consumers of the active deck.
 */
export function BuildDeckClient({ catalogResult }: BuildDeckClientProps) {
  const cards = catalogResult.status === "ok" ? catalogResult.cards : EMPTY_CARDS;
  const catalog = useMemo(() => buildCatalogLookup(cards), [cards]);

  const { state: activeDeckState, saveStatus, save } = useActiveDeckPersistence();
  const syncSummary = useActiveDeckSync();
  const initializeDraft = useDeckDraftStore((state) => state.initializeDraft);
  const discardDraft = useDeckDraftStore((state) => state.discardDraft);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (activeDeckState.status === "ready" && !initializedRef.current) {
      initializedRef.current = true;
      initializeDraft(activeDeckState.activeDeck);
    }
  }, [activeDeckState, initializeDraft]);

  const draftState = useDeckDraft();
  const validation = useDeckValidation();
  const collectionState = useCollection();
  const { confirmInternalNavigation } = useUnsavedChangesWarning(draftState.hasUnsavedChanges);
  const panel = useCollectionPanel(cards, draftState.activeDeckLookup);

  function handleLeaveEditor(): void {
    if (!confirmInternalNavigation()) {
      return;
    }
    discardDraft();
    window.history.back();
  }

  function handleSaveDeck(): void {
    if (collectionState.status !== "ready") {
      return;
    }
    void save(draftState.draft, collectionState.loaded.collection);
  }

  if (catalogResult.status === "error") {
    return <CollectionFailure message={BUILD_DECK_MESSAGES.catalogUnavailable} />;
  }

  if (activeDeckState.status === "error") {
    const message =
      activeDeckState.error.code === "session_missing"
        ? BUILD_DECK_MESSAGES.sessionMissing
        : BUILD_DECK_MESSAGES.collectionUnavailable;
    return <CollectionFailure message={message} />;
  }

  if (activeDeckState.status === "loading" || activeDeckState.status === "pending") {
    return <p role="status">{BUILD_DECK_MESSAGES.preparingInitialDeck}</p>;
  }

  if (panel.status === "loading") {
    return <PanelSkeleton />;
  }

  if (panel.status === "error") {
    const message =
      panel.error.code === "session_missing"
        ? BUILD_DECK_MESSAGES.sessionMissing
        : BUILD_DECK_MESSAGES.collectionUnavailable;
    return <CollectionFailure message={message} />;
  }

  if (panel.isEmpty) {
    return <EmptyCollectionState />;
  }

  const selectedCard =
    panel.selectedCardNumber === undefined ? undefined : catalog(panel.selectedCardNumber);

  return (
    <>
      <button type="button" onClick={handleLeaveEditor}>
        ◀ Voltar
      </button>
      {panel.origin === "cache" ? <p role="status">{BUILD_DECK_MESSAGES.cacheNotice}</p> : null}
      <CollectionPanel
        items={panel.items}
        term={panel.term}
        onTermChange={panel.setTerm}
        isEmpty={panel.isEmpty}
        selectedCardNumber={panel.selectedCardNumber}
        onSelectCard={panel.select}
      />
      <BlockMessage lastBlock={draftState.lastBlock} />
      <DeckValidationSummary validation={validation} catalog={catalog} />
      <DeckEditor
        draft={draftState.draft}
        catalog={catalog}
        total={draftState.total}
        selectedCard={selectedCard === undefined ? undefined : { numero: selectedCard.numero, nome: selectedCard.nome }}
        canAddCard={draftState.canAddCard}
        onAddCard={draftState.addCard}
        onRemoveCard={draftState.removeCard}
      />
      <SaveDeckIndicator
        canSave={validation.valid && !validation.loading}
        saveStatus={saveStatus}
        conflictDetected={activeDeckState.conflictDetected}
        syncSummary={syncSummary}
        onSave={handleSaveDeck}
      />
    </>
  );
}
