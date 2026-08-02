"use client";

import {
  CARD_TYPES,
  GUARDIAN_STARS,
  type BuildDeckCollectionSortField,
  type Card,
  type CardType,
  type GuardianStar,
} from "@yugioh/shared";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BlockMessage } from "../../components/build-deck/block-message.tsx";
import { CollectionFailure } from "../../components/build-deck/collection-failure.tsx";
import { CollectionPanel } from "../../components/build-deck/collection-panel.tsx";
import { DeckEditor } from "../../components/build-deck/deck-editor.tsx";
import { DeckValidationSummary } from "../../components/build-deck/deck-validation-summary.tsx";
import { EmptyCollectionState } from "../../components/build-deck/empty-collection-state.tsx";
import {
  BUILD_DECK_MESSAGES,
  CARD_TYPE_LABELS,
  tabMyDeckLabel,
} from "../../components/build-deck/messages.ts";
import { PanelSkeleton } from "../../components/build-deck/panel-skeleton.tsx";
import { SaveDeckIndicator } from "../../components/build-deck/save-deck-indicator.tsx";
import { useActiveDeckPersistence } from "../../hooks/use-active-deck-persistence.ts";
import { useActiveDeckSync } from "../../hooks/use-active-deck-sync.ts";
import { useCollection } from "../../hooks/use-collection.ts";
import { useCollectionPanel } from "../../hooks/use-collection-panel.ts";
import { useDeckDraft } from "../../hooks/use-deck-draft.ts";
import { useDeckValidation } from "../../hooks/use-deck-validation.ts";
import { useUnsavedChangesWarning } from "../../hooks/use-unsaved-changes-warning.ts";
import { useVictoryRewardSync } from "../../hooks/use-victory-reward-sync.ts";
import { buildCatalogLookup } from "../../lib/build-deck/catalog-lookup.ts";
import { useDeckDraftStore } from "../../stores/deck-draft-store.ts";
import styles from "./build-deck-client.module.css";

/** The catalog, resolved server-side in `page.tsx` via `loadCatalogFromDisk` (fs access is server-only). */
export type CatalogResult =
  Readonly<{ status: "ok"; cards: readonly Card[] }> | Readonly<{ status: "error" }>;

export type BuildDeckClientProps = Readonly<{
  catalogResult: CatalogResult;
}>;

const EMPTY_CARDS: readonly Card[] = [];

/** "Todos" plus every `CardType`, in the fixed order the filter row renders. */
const CARD_TYPE_FILTERS: readonly ("todos" | CardType)[] = ["todos", ...CARD_TYPES];
const ALL_FILTER_VALUE = "";

const SORT_FIELD_LABELS: Readonly<Record<BuildDeckCollectionSortField, string>> = {
  numero: "Número",
  nome: "Nome",
  atk: "ATK",
  def: "DEF",
  estrelas: "Estrelas",
  quantity: "Quantidade",
};

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
 *
 * The tab/view controls are local presentation state. Collection query
 * controls (type, class, guardian, sort) live in `useCollectionPanel`, where
 * they stay pure and read-only before F05 consumes the selected card.
 */
export function BuildDeckClient({ catalogResult }: BuildDeckClientProps) {
  const cards = catalogResult.status === "ok" ? catalogResult.cards : EMPTY_CARDS;
  const catalog = useMemo(() => buildCatalogLookup(cards), [cards]);
  useVictoryRewardSync(catalogResult.status === "ok" ? catalog : undefined);

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

  const [tab, setTab] = useState<"todas" | "meu-deck">("todas");
  const [view, setView] = useState<"list" | "grid">("list");

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

  let content: ReactNode;

  if (catalogResult.status === "error") {
    content = <CollectionFailure message={BUILD_DECK_MESSAGES.catalogUnavailable} />;
  } else if (activeDeckState.status === "error") {
    const message =
      activeDeckState.error.code === "session_missing"
        ? BUILD_DECK_MESSAGES.sessionMissing
        : BUILD_DECK_MESSAGES.collectionUnavailable;
    content = <CollectionFailure message={message} />;
  } else if (activeDeckState.status === "loading" || activeDeckState.status === "pending") {
    content = <p role="status">{BUILD_DECK_MESSAGES.preparingInitialDeck}</p>;
  } else if (panel.status === "loading") {
    content = <PanelSkeleton />;
  } else if (panel.status === "error") {
    const message =
      panel.error.code === "session_missing"
        ? BUILD_DECK_MESSAGES.sessionMissing
        : BUILD_DECK_MESSAGES.collectionUnavailable;
    content = <CollectionFailure message={message} />;
  } else if (panel.isEmpty) {
    content = <EmptyCollectionState />;
  } else {
    const selectedCard =
      panel.selectedCardNumber === undefined ? undefined : catalog(panel.selectedCardNumber);
    const selectedCardSummary =
      selectedCard === undefined
        ? undefined
        : { numero: selectedCard.numero, nome: selectedCard.nome };

    const cardClasses = Array.from(new Set(panel.allItems.map((item) => item.card.classe))).sort();
    const availableGuardians = GUARDIAN_STARS.filter((guardian) =>
      panel.allItems.some(
        (item) => item.card.guardiao1 === guardian || item.card.guardiao2 === guardian,
      ),
    );

    const scopedItems =
      tab === "meu-deck" ? panel.items.filter((item) => item.deckQuantity > 0) : panel.items;
    const showEmptyDeckTab = tab === "meu-deck" && scopedItems.length === 0 && panel.term === "";
    const showFilterEmptyState =
      tab === "todas" && scopedItems.length === 0 && panel.allItems.length > 0 && panel.term === "";

    content = (
      <>
        <button type="button" onClick={handleLeaveEditor}>
          ◀ Voltar
        </button>
        {panel.origin === "cache" ? <p role="status">{BUILD_DECK_MESSAGES.cacheNotice}</p> : null}
        <div className={styles.tabs} role="tablist" aria-label="Abas de cartas">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "todas"}
            className={tab === "todas" ? styles.tabActive : styles.tab}
            onClick={() => setTab("todas")}
          >
            {BUILD_DECK_MESSAGES.tabAllCards}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "meu-deck"}
            className={tab === "meu-deck" ? styles.tabActive : styles.tab}
            onClick={() => setTab("meu-deck")}
          >
            {tabMyDeckLabel(draftState.total)}
          </button>
        </div>
        <div className={styles.viewToggle} role="group" aria-label="Modo de exibição">
          <button
            type="button"
            className={view === "list" ? styles.viewActive : styles.view}
            onClick={() => setView("list")}
          >
            {BUILD_DECK_MESSAGES.viewList}
          </button>
          <button
            type="button"
            className={view === "grid" ? styles.viewActive : styles.view}
            onClick={() => setView("grid")}
          >
            {BUILD_DECK_MESSAGES.viewGrid}
          </button>
        </div>
        <div className={styles.filters}>
          <div className={styles.filterGroup} role="group" aria-label="Tipo de carta">
            {CARD_TYPE_FILTERS.map((type) => (
              <button
                key={type}
                type="button"
                className={
                  (type === "todos" && panel.filters.cardType === undefined) ||
                  panel.filters.cardType === type
                    ? styles.filterActive
                    : styles.filter
                }
                onClick={() =>
                  panel.setFilters({
                    ...panel.filters,
                    cardType: type === "todos" ? undefined : type,
                  })
                }
              >
                {type === "todos" ? BUILD_DECK_MESSAGES.allCardTypes : CARD_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <div className={styles.filterSelects}>
            <label className={styles.selectLabel} htmlFor="build-deck-card-class">
              Classe
            </label>
            <select
              id="build-deck-card-class"
              className={styles.selectControl}
              value={panel.filters.cardClass ?? ALL_FILTER_VALUE}
              onChange={(event) =>
                panel.setFilters({
                  ...panel.filters,
                  cardClass: event.currentTarget.value || undefined,
                })
              }
            >
              <option value={ALL_FILTER_VALUE}>{BUILD_DECK_MESSAGES.allCardClasses}</option>
              {cardClasses.map((cardClass) => (
                <option key={cardClass} value={cardClass}>
                  {cardClass}
                </option>
              ))}
            </select>
            <label className={styles.selectLabel} htmlFor="build-deck-guardian">
              Guardião
            </label>
            <select
              id="build-deck-guardian"
              className={styles.selectControl}
              value={panel.filters.guardian ?? ALL_FILTER_VALUE}
              onChange={(event) =>
                panel.setFilters({
                  ...panel.filters,
                  guardian: (event.currentTarget.value || undefined) as GuardianStar | undefined,
                })
              }
            >
              <option value={ALL_FILTER_VALUE}>{BUILD_DECK_MESSAGES.allGuardians}</option>
              {availableGuardians.map((guardian) => (
                <option key={guardian} value={guardian}>
                  {guardian}
                </option>
              ))}
            </select>
            <label className={styles.selectLabel} htmlFor="build-deck-sort-field">
              Ordenar por
            </label>
            <select
              id="build-deck-sort-field"
              className={styles.selectControl}
              value={panel.sort.field}
              onChange={(event) =>
                panel.setSort({
                  ...panel.sort,
                  field: event.currentTarget.value as BuildDeckCollectionSortField,
                })
              }
            >
              {Object.entries(SORT_FIELD_LABELS).map(([field, label]) => (
                <option key={field} value={field}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.filter}
              aria-label={
                panel.sort.direction === "asc"
                  ? BUILD_DECK_MESSAGES.sortAscending
                  : BUILD_DECK_MESSAGES.sortDescending
              }
              onClick={() =>
                panel.setSort({
                  ...panel.sort,
                  direction: panel.sort.direction === "asc" ? "desc" : "asc",
                })
              }
            >
              {panel.sort.direction === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
        {showEmptyDeckTab ? (
          <p className={styles.emptyState}>{BUILD_DECK_MESSAGES.emptyDeckTab}</p>
        ) : showFilterEmptyState ? (
          <p className={styles.emptyState}>{BUILD_DECK_MESSAGES.emptyFilterResult}</p>
        ) : (
          <CollectionPanel
            items={scopedItems}
            term={panel.term}
            onTermChange={panel.setTerm}
            isEmpty={panel.isEmpty}
            selectedCardNumber={panel.selectedCardNumber}
            onSelectCard={panel.select}
            view={view}
          />
        )}
        <BlockMessage lastBlock={draftState.lastBlock} />
        <DeckValidationSummary validation={validation} catalog={catalog} />
        <DeckEditor
          draft={draftState.draft}
          catalog={catalog}
          total={draftState.total}
          selectedCard={selectedCardSummary}
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

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1>Build Deck</h1>
        {panel.status === "ready" && !panel.isEmpty ? (
          <p className={styles.count}>
            Deck <strong>{draftState.total}</strong> / 40
          </p>
        ) : null}
      </header>
      {content}
    </div>
  );
}
