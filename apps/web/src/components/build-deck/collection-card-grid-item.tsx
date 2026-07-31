"use client";

import type { CardNumber, CollectionItemWithDeck } from "@yugioh/shared";

import { cardArtUrl } from "../../lib/card-art-url.ts";
import { BUILD_DECK_MESSAGES } from "./messages.ts";
import styles from "./collection-panel.module.css";

export type CollectionCardGridItemProps = Readonly<{
  item: CollectionItemWithDeck;
  selected: boolean;
  onSelectCard: (cardNumber: CardNumber) => void;
}>;

/**
 * The "Grade" view's card-art cell: same selection semantics as
 * `CollectionCardItem` (click/Enter/Space selects, `aria-pressed` marks the
 * current selection) behind an art-forward layout instead of a data row.
 */
export function CollectionCardGridItem({ item, selected, onSelectCard }: CollectionCardGridItemProps) {
  const { card, deckQuantity, limitReached } = item;

  function activate(): void {
    onSelectCard(card.numero);
  }

  return (
    <li
      className={selected ? `${styles.gridItem} ${styles.selected}` : styles.gridItem}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={card.nome}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
    >
      <img className={styles.gridArt} src={cardArtUrl(card.numero)} alt="" loading="lazy" />
      <span className={styles.gridName}>{card.nome}</span>
      <span className={styles.gridStats}>
        {card.atk ?? "—"} / {card.def ?? "—"}
      </span>
      {deckQuantity > 0 ? <span className={styles.gridCount}>×{deckQuantity}</span> : null}
      {limitReached ? <span className={styles.limit}>{BUILD_DECK_MESSAGES.limitReached}</span> : null}
    </li>
  );
}
