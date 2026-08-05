import type { Card } from "@yugioh/shared";
import { cropArtUrl } from "../../lib/card-art-url.ts";
import { shouldUseCardFrame } from "../../lib/card-frame/should-use-card-frame.ts";
import { CardFrame } from "../card-frame/card-frame.tsx";
import { DuelCardArt } from "./duel-card-art.tsx";
import styles from "./duel-card-preview.module.css";

export function DuelCardPreview({ card }: { readonly card: Card | null }) {
  if (!card) return null;

  const useFrame = shouldUseCardFrame(card, { kind: "art", path: cropArtUrl(card.numero) });
  if (useFrame) {
    return (
      <aside className={styles.preview} aria-label={`Previa de ${card.nome}`}>
        <CardFrame card={card} art={{ kind: "art", path: cropArtUrl(card.numero) }} size="completo" />
      </aside>
    );
  }

  return (
    <aside className={styles.preview} aria-label={`Previa de ${card.nome}`}>
      <DuelCardArt cardNumber={card.numero} label={card.nome} />
      <p className={styles.name}>{card.nome}</p>
    </aside>
  );
}
