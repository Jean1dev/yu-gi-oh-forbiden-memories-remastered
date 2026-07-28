"use client";

import type { CardNumber, CollectionItemWithDeck } from "@yugioh/shared";

import { BUILD_DECK_MESSAGES } from "./messages.ts";
import styles from "./collection-card-item.module.css";

export type CollectionCardItemProps = Readonly<{
  item: CollectionItemWithDeck;
  selected: boolean;
  onSelectCard: (cardNumber: CardNumber) => void;
}>;

/** One collection entry: art, name, class, type, ATK/DEF, "owns N · in deck M" and the limit-reached mark. */
export function CollectionCardItem({ item, selected, onSelectCard }: CollectionCardItemProps) {
  const { card, quantity, deckQuantity, limitReached } = item;

  function activate(): void {
    onSelectCard(card.numero);
  }

  return (
    <li
      className={selected ? `${styles.item} ${styles.selected}` : styles.item}
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
      <img className={styles.art} src={`/cards-data/${card.numero}.jpg`} alt="" loading="lazy" />
      <span className={styles.name}>{card.nome}</span>
      <span>{card.classe}</span>
      <span>{card.tipo}</span>
      <span>
        {card.atk ?? "—"} / {card.def ?? "—"}
      </span>
      <span>
        possui {quantity} · no deck {deckQuantity}
      </span>
      {limitReached ? <span className={styles.limit}>{BUILD_DECK_MESSAGES.limitReached}</span> : null}
    </li>
  );
}
