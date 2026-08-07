import type { Card } from "@yugioh/shared";
import { DuelCardArt } from "./duel-card-art.tsx";
import styles from "./player-hand.module.css";

export function PlayerHand({
  cards,
  disabled,
  selectedIndex = null,
  selectedIndices = [],
  drawnCount = 0,
  onSelect,
}: {
  readonly cards: readonly Card[];
  readonly disabled: boolean;
  readonly selectedIndex?: number | null;
  readonly selectedIndices?: readonly number[];
  readonly drawnCount?: number;
  readonly onSelect?: ((index: number) => void) | undefined;
}) {
  return (
    <section className={styles.section} aria-label="Mao do jogador">
      <ul className={styles.list}>
        {cards.map((card, index) => (
          // A 64px thumbnail: too small for the full `CardFrame`, which is why
          // selecting a card fills the inspector column with it instead.
          <li className={styles.item} key={`${card.numero}-${index}`}>
            <button
              className={styles.card}
              type="button"
              aria-label={card.nome}
              aria-pressed={selectedIndex === index || selectedIndices.includes(index)}
              data-drawn={drawnCount > 0 && index >= cards.length - drawnCount ? "true" : undefined}
              disabled={disabled}
              onClick={() => onSelect?.(index)}
            >
              <DuelCardArt cardNumber={card.numero} label={card.nome} crop />
              <span className={styles.name} aria-hidden="true">
                {card.nome}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
