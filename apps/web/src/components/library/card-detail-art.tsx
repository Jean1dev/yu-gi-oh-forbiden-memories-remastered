import type { ArtReference, Card, ObtainedArtReference } from "@yugioh/shared";

import { shouldUseCardFrame } from "../../lib/card-frame/should-use-card-frame.ts";
import { CardFrame } from "../card-frame/card-frame.tsx";
import { CardArt } from "./card-art.tsx";
import styles from "./card-detail.module.css";

export type CardDetailArtProps = Readonly<{
  /** Omitted for a blocked (not-obtained) card, which never carries `Card` data. */
  card?: Card | undefined;
  art: ArtReference;
  cropArt?: ObtainedArtReference | undefined;
  label: string;
}>;

export function CardDetailArt({ card, art, cropArt, label }: CardDetailArtProps) {
  const useFrame = card !== undefined && shouldUseCardFrame(card, cropArt);

  return (
    <div className={styles.art}>
      {useFrame && card !== undefined && cropArt !== undefined ? (
        <CardFrame card={card} art={cropArt} size="completo" />
      ) : (
        <CardArt art={art} label={label} />
      )}
    </div>
  );
}
