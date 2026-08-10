import { DuelCardArt } from "./duel-card-art.tsx";
import styles from "./opponent-hand.module.css";

/** The opponent's hand: only the count is known, so every card renders face-down. */
export function OpponentHand({ count }: { readonly count: number }) {
  if (count === 0) return null;

  return (
    <ul className={styles.list} aria-label={`Mao do oponente, ${count} cartas`}>
      {Array.from({ length: count }, (_, index) => (
        <li className={styles.item} key={index}>
          <DuelCardArt hidden label="Carta virada" />
        </li>
      ))}
    </ul>
  );
}
