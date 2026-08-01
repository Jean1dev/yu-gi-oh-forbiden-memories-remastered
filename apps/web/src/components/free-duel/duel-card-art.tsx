"use client";

import type { CardNumber } from "@yugioh/shared";
import { useState } from "react";
import { cardArtUrl } from "../../lib/card-art-url.ts";
import styles from "./duel-card-art.module.css";

export type DuelCardArtProps = Readonly<{
  cardNumber?: CardNumber | undefined;
  label: string;
  hidden?: boolean | undefined;
}>;

export function DuelCardArt({ cardNumber, label, hidden = false }: DuelCardArtProps) {
  const [failed, setFailed] = useState(false);

  if (hidden) {
    return (
      <span className={styles.frame} role="img" aria-label={label}>
        <span className={styles.back} aria-hidden="true" />
      </span>
    );
  }

  if (!cardNumber || failed) {
    return (
      <span className={styles.frame} role="img" aria-label={label}>
        <span className={styles.placeholder} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className={styles.frame}>
      <img
        className={styles.image}
        src={cardArtUrl(cardNumber)}
        alt={label}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
