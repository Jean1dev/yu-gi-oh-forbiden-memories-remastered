import styles from "./deck-pile.module.css";

/** A remaining-deck counter in the right rail. */
export function DeckPile({ count, label }: Readonly<{ count: number; label: string }>) {
  return (
    <p className={styles.pile} aria-label={`${label}, ${count} cartas`}>
      <span className={styles.count}>{count}</span>
      <span className={styles.label}>{label}</span>
    </p>
  );
}
