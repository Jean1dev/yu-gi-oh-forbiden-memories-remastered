"use client";

import { enrichCollection } from "@yugioh/rules";
import type { CardCatalogLookup, CardNumber, DeckDraft } from "@yugioh/shared";

import { BUILD_DECK_MESSAGES } from "./messages.ts";
import styles from "./deck-editor.module.css";

export type DeckEditorProps = Readonly<{
  draft: DeckDraft;
  catalog: CardCatalogLookup;
  total: number;
  /** The card selected in F04's panel, added by clicking "＋" here (spec build-deck/F05 §3, Fluxo step 3). */
  selectedCard: Readonly<{ numero: CardNumber; nome: string }> | undefined;
  /** `false` while F01's collection has not resolved yet — the "＋" stays disabled (spec build-deck/F05 §6). */
  canAddCard: boolean;
  onAddCard: (cardNumber: CardNumber) => void;
  onRemoveCard: (cardNumber: CardNumber) => void;
}>;

/** The draft-in-edition panel: the selected card's "＋", every card in the draft with a "－", and the running total. */
export function DeckEditor({
  draft,
  catalog,
  total,
  selectedCard,
  canAddCard,
  onAddCard,
  onRemoveCard,
}: DeckEditorProps) {
  const { items } = enrichCollection(draft, catalog);

  return (
    <div className={styles.editor}>
      <div className={styles.addRow}>
        {selectedCard === undefined ? (
          <p>{BUILD_DECK_MESSAGES.addCardPrompt}</p>
        ) : (
          <button
            type="button"
            disabled={!canAddCard}
            onClick={() => onAddCard(selectedCard.numero)}
          >
            ＋ Adicionar {selectedCard.nome} ao deck
          </button>
        )}
      </div>
      <p aria-live="polite">Total no deck: {total}</p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.card.numero} className={styles.item}>
            <span className={styles.name}>{item.card.nome}</span>
            <span>x{item.quantity}</span>
            <button
              type="button"
              aria-label={`Remover uma cópia de ${item.card.nome}`}
              onClick={() => onRemoveCard(item.card.numero)}
            >
              －
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
