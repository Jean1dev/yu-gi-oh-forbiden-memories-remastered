"use client";

import type { Card } from "@yugioh/shared";

import { CollectionFailure } from "../../components/build-deck/collection-failure.tsx";
import { CollectionPanel } from "../../components/build-deck/collection-panel.tsx";
import { EmptyCollectionState } from "../../components/build-deck/empty-collection-state.tsx";
import { BUILD_DECK_MESSAGES } from "../../components/build-deck/messages.ts";
import { PanelSkeleton } from "../../components/build-deck/panel-skeleton.tsx";
import { useCollectionPanel } from "../../hooks/use-collection-panel.ts";
import { unavailableActiveDeck } from "../../lib/build-deck/unavailable-active-deck.ts";

/** The catalog, resolved server-side in `page.tsx` via `loadCatalogFromDisk` (fs access is server-only). */
export type CatalogResult =
  | Readonly<{ status: "ok"; cards: readonly Card[] }>
  | Readonly<{ status: "error" }>;

export type BuildDeckClientProps = Readonly<{
  catalogResult: CatalogResult;
}>;

const EMPTY_CARDS: readonly Card[] = [];

/**
 * No real `ActiveDeckLookup` exists yet (build-deck/F02, F05, F07 are
 * expected to provide one) — the neutral fallback keeps every card at "in
 * deck 0" instead of inventing a value (spec build-deck/F04, Decision 3).
 */
const NO_ACTIVE_DECK = unavailableActiveDeck();

/** The state machine driving `/build-deck`: skeleton, failure, empty collection, or the ready panel. */
export function BuildDeckClient({ catalogResult }: BuildDeckClientProps) {
  const panel = useCollectionPanel(
    catalogResult.status === "ok" ? catalogResult.cards : EMPTY_CARDS,
    NO_ACTIVE_DECK,
  );

  if (catalogResult.status === "error") {
    return <CollectionFailure message={BUILD_DECK_MESSAGES.catalogUnavailable} />;
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

  return (
    <>
      {panel.origin === "cache" ? <p role="status">{BUILD_DECK_MESSAGES.cacheNotice}</p> : null}
      <CollectionPanel
        items={panel.items}
        term={panel.term}
        onTermChange={panel.setTerm}
        isEmpty={panel.isEmpty}
        selectedCardNumber={panel.selectedCardNumber}
        onSelectCard={panel.select}
      />
    </>
  );
}
