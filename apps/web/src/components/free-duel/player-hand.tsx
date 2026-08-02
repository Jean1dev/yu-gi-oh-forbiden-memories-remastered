import type { Card } from "@yugioh/shared";
import { DuelCardArt } from "./duel-card-art.tsx";
import styles from "./player-hand.module.css";

export function PlayerHand({
  cards,
  disabled,
  selectedIndex = null,
  drawnCount = 0,
  onSelect,
}: {
  readonly cards: readonly Card[];
  readonly disabled: boolean;
  readonly selectedIndex?: number | null;
  readonly drawnCount?: number;
  readonly onSelect?: ((index: number) => void) | undefined;
}) {
  return (
    <section className={styles.section} aria-label="Mao do jogador">
      <ul className={styles.list}>
        {cards.map((card, index) => (
          <li className={styles.item} key={`${card.numero}-${index}`}>
            <button
              className={styles.card}
              type="button"
              aria-label={card.nome}
              aria-pressed={selectedIndex === index}
              data-drawn={drawnCount > 0 && index >= cards.length - drawnCount ? "true" : undefined}
              disabled={disabled}
              onClick={() => onSelect?.(index)}
            >
              <DuelCardArt cardNumber={card.numero} label={card.nome} />
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
