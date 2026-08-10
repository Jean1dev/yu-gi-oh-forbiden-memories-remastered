"use client";

import type { CardNumber } from "@yugioh/shared";
import { useState } from "react";
import { CARD_BACK_URL, cardArtUrl, cropArtUrl } from "../../lib/card-art-url.ts";
import styles from "./duel-card-art.module.css";

export type DuelCardArtProps = Readonly<{
  cardNumber?: CardNumber | undefined;
  label: string;
  hidden?: boolean | undefined;
  /**
   * Read the illustration (`cards-data/art/`) rather than the full-card jpg.
   * Only 38 cards have a full-card jpg on disk against 684 crops, so anything
   * that must render reliably asks for the crop.
   */
  crop?: boolean | undefined;
  /** Fill the parent instead of holding a 3:4 card box. */
  fill?: boolean | undefined;
}>;

export function DuelCardArt({
  cardNumber,
  label,
  hidden = false,
  crop = false,
  fill = false,
}: DuelCardArtProps) {
  const [failed, setFailed] = useState(false);
  const dataFill = fill ? "true" : undefined;

  if (hidden) {
    // The real card back, with the woven-gold pattern kept as the `onError`
    // fallback so a missing asset degrades to the old look rather than to a
    // broken image.
    return failed ? (
      <span className={styles.frame} data-fill={dataFill} role="img" aria-label={label}>
        <span className={styles.back} aria-hidden="true" />
      </span>
    ) : (
      <span className={styles.frame} data-fill={dataFill}>
        <img
          className={styles.image}
          src={CARD_BACK_URL}
          alt={label}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  if (!cardNumber || failed) {
    return (
      <span className={styles.frame} data-fill={dataFill} role="img" aria-label={label}>
        <span className={styles.placeholder} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className={styles.frame} data-fill={dataFill}>
      <img
        className={styles.image}
        src={crop ? cropArtUrl(cardNumber) : cardArtUrl(cardNumber)}
        alt={label}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
