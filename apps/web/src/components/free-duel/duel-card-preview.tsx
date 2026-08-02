import type { Card } from "@yugioh/shared";
import { DuelCardArt } from "./duel-card-art.tsx";
import styles from "./duel-card-preview.module.css";

export function DuelCardPreview({ card }: { readonly card: Card | null }) {
  if (!card) return null;

  return (
    <aside className={styles.preview} aria-label={`Previa de ${card.nome}`}>
      <DuelCardArt cardNumber={card.numero} label={card.nome} />
      <p className={styles.name}>{card.nome}</p>
    </aside>
  );
}
