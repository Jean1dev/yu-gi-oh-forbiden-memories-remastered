"use client";

import type { CardNumber, CollectionItemWithDeck } from "@yugioh/shared";

import { CollectionCardGridItem } from "./collection-card-grid-item.tsx";
import { CollectionCardItem } from "./collection-card-item.tsx";
import { CollectionSearchField } from "./collection-search-field.tsx";
import { NoSearchResults } from "./no-search-results.tsx";
import styles from "./collection-panel.module.css";

export type CollectionPanelProps = Readonly<{
  /** Already filtered by `term` and composed with the deck quantity. */
  items: readonly CollectionItemWithDeck[];
  term: string;
  onTermChange: (term: string) => void;
  /** Whether the whole collection (before search) has zero owned cards. */
  isEmpty: boolean;
  selectedCardNumber: CardNumber | undefined;
  onSelectCard: (cardNumber: CardNumber) => void;
  /** "list" renders one row per card (default); "grid" renders card-art cells. */
  view?: "list" | "grid";
}>;

/** Renders the search field and the list the hook already filtered and composed — no rule lives here. */
export function CollectionPanel({
  items,
  term,
  onTermChange,
  isEmpty,
  selectedCardNumber,
  onSelectCard,
  view = "list",
}: CollectionPanelProps) {
  return (
    <div className={styles.panel}>
      {isEmpty ? null : <CollectionSearchField value={term} onChange={onTermChange} />}
      {items.length === 0 ? (
        isEmpty ? null : <NoSearchResults term={term} />
      ) : (
        <ul className={view === "grid" ? styles.grid : styles.list}>
          {items.map((item) =>
            view === "grid" ? (
              <CollectionCardGridItem
                key={item.card.numero}
                item={item}
                selected={item.card.numero === selectedCardNumber}
                onSelectCard={onSelectCard}
              />
            ) : (
              <CollectionCardItem
                key={item.card.numero}
                item={item}
                selected={item.card.numero === selectedCardNumber}
                onSelectCard={onSelectCard}
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}
