import type { Card } from "@yugioh/shared";
import { cropArtUrl } from "../../lib/card-art-url.ts";
import { shouldUseCardFrame } from "../../lib/card-frame/should-use-card-frame.ts";
import { CardFrame } from "../card-frame/card-frame.tsx";
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
        {cards.map((card, index) => {
          // Same client-side assumption as DuelZone (spec F06, Decision 1):
          // no manifest reaches the duel board, so "migrated" is read straight
          // off the card, and a wrong guess falls back through CardArt's
          // `onError` inside `CardFrame` itself.
          const useFrame = shouldUseCardFrame(card, { kind: "art", path: cropArtUrl(card.numero) });
          return (
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
                {useFrame ? (
                  <CardFrame card={card} art={{ kind: "art", path: cropArtUrl(card.numero) }} size="compacto" />
                ) : (
                  <>
                    <DuelCardArt cardNumber={card.numero} label={card.nome} />
                    <span className={styles.name} aria-hidden="true">
                      {card.nome}
                    </span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
