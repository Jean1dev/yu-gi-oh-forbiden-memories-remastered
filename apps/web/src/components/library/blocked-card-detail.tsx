import type { CardNumber } from "@yugioh/shared";

import { CardDetailArt } from "./card-detail-art.tsx";
import styles from "./card-detail.module.css";
import { LibraryBackAction } from "./library-back-action.tsx";
import { LIBRARY_MESSAGES } from "./messages.ts";

export type BlockedCardDetailProps = Readonly<{
  cardNumber: CardNumber;
  art: Readonly<{ kind: "silhouette" }>;
  returnDestination: string;
  returnMode?: "link" | "history";
}>;

export function BlockedCardDetail({
  cardNumber,
  art,
  returnDestination,
  returnMode = "link",
}: BlockedCardDetailProps) {
  return (
    <article className={styles.detail} aria-labelledby="blocked-card-title">
      <LibraryBackAction returnDestination={returnDestination} mode={returnMode} />
      <div className={styles.blocked}>
        <CardDetailArt art={art} label="" />
        <p className={styles.number}>#{cardNumber}</p>
        <h1 id="blocked-card-title">{LIBRARY_MESSAGES.cardNotObtained}</h1>
      </div>
    </article>
  );
}
