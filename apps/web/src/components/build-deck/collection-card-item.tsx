"use client";

import type { CardNumber, CollectionItemWithDeck } from "@yugioh/shared";
import type { SyntheticEvent } from "react";

import { cardArtUrl, cropArtUrl } from "../../lib/card-art-url.ts";
import { BUILD_DECK_MESSAGES } from "./messages.ts";
import styles from "./collection-card-item.module.css";

export type CollectionCardItemProps = Readonly<{
  item: CollectionItemWithDeck;
  selected: boolean;
  onSelectCard: (cardNumber: CardNumber) => void;
}>;

/**
 * One collection entry: art, name, class, type, ATK/DEF, "owns N · in deck M"
 * and the limit-reached mark.
 *
 * The 48px thumbnail has no room for `CardFrame`'s composed name/stats — the
 * row already shows those as separate columns — so a migrated card only
 * swaps in the higher-resolution crop art (spec F06, Decision 1 still
 * applies to *which* image, not to using the full frame here). `onError`
 * falls back to the legacy image, same as `CardArt` does elsewhere.
 */
export function CollectionCardItem({ item, selected, onSelectCard }: CollectionCardItemProps) {
  const { card, quantity, deckQuantity, limitReached } = item;
  const migrated = card.descricao !== null && card.descricao !== undefined;

  function activate(): void {
    onSelectCard(card.numero);
  }

  function handleArtError(event: SyntheticEvent<HTMLImageElement>): void {
    event.currentTarget.src = cardArtUrl(card.numero);
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
      <img
        className={styles.art}
        src={migrated ? cropArtUrl(card.numero) : cardArtUrl(card.numero)}
        alt=""
        loading="lazy"
        onError={migrated ? handleArtError : undefined}
      />
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
