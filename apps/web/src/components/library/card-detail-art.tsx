import type { ArtReference } from "@yugioh/shared";

import { CardArt } from "./card-art.tsx";
import styles from "./card-detail.module.css";

export type CardDetailArtProps = Readonly<{
  art: ArtReference;
  label: string;
}>;

export function CardDetailArt({ art, label }: CardDetailArtProps) {
  return (
    <div className={styles.art}>
      <CardArt art={art} label={label} />
    </div>
  );
}
