import type { Card } from "@yugioh/shared";
import { cropArtUrl } from "../../lib/card-art-url.ts";
import { shouldUseCardFrame } from "../../lib/card-frame/should-use-card-frame.ts";
import { CardFrame } from "../card-frame/card-frame.tsx";
import { DuelCardArt } from "./duel-card-art.tsx";
import styles from "./duel-card-preview.module.css";

/** `EARTH / Warrior`, or just the class when the card was never enriched. */
function kindLine(card: Card): string {
  return card.atributo ? `${card.atributo} / ${card.classe}` : card.classe;
}

function guardianLine(card: Card): string | null {
  const guardians = [card.guardiao1, card.guardiao2].filter((star) => star !== null);
  return guardians.length > 0 ? guardians.join(" / ") : null;
}

/**
 * The inspector column's contents: the full card, then everything about it in
 * words.
 *
 * It renders a fragment rather than its own landmark — the duel screen's
 * `<aside>` already is one, and nesting a second `aside` inside it made the
 * card name appear twice.
 */
export function DuelCardPreview({ card }: { readonly card: Card | null }) {
  if (!card) return null;

  const art = { kind: "art", path: cropArtUrl(card.numero) } as const;
  const guardians = guardianLine(card);

  return (
    <>
      <div className={styles.card}>
        {shouldUseCardFrame(card, art) ? (
          <CardFrame card={card} art={art} size="completo" />
        ) : (
          <DuelCardArt cardNumber={card.numero} label={card.nome} />
        )}
      </div>
      <div className={styles.meta}>
        <h2 className={styles.name}>{card.nome}</h2>
        {card.atk !== null ? (
          <p className={styles.stats}>
            {card.atk} / {card.def ?? "-"}
          </p>
        ) : null}
        <p className={styles.kind}>{kindLine(card)}</p>
        {guardians ? <p className={styles.guardians}>Guardiões: {guardians}</p> : null}
        {card.descricao ? (
          <p className={styles.description}>
            <span>Efeito:</span> {card.descricao}
          </p>
        ) : null}
      </div>
    </>
  );
}
