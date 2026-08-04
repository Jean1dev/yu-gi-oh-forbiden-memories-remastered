"use client";

import type { ArtReference, Card } from "@yugioh/shared";

import { CardArt } from "../library/card-art.tsx";
import { SpellTrapBadge } from "./spell-trap-badge.tsx";
import styles from "./spell-trap-card-frame.module.css";

export type SpellTrapCardFrameProps = Readonly<{
  card: Card;
  art: ArtReference;
  size?: "completo" | "compacto";
}>;

/** Renders a non-monster `Card` from parts, in the green (spell) / pink (trap) frame (spec F05). */
export function SpellTrapCardFrame({ card, art, size = "completo" }: SpellTrapCardFrameProps) {
  const isTrap = card.tipo === "armadilha";

  if (size === "compacto") {
    return (
      <div className={styles.frame} data-kind={isTrap ? "armadilha" : "magia"} data-size="compacto">
        <div className={styles.artWindow}>
          <CardArt art={art} label={card.nome} />
        </div>
        <div className={styles.compactFooter}>
          <span className={styles.name}>{card.nome}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.frame} data-kind={isTrap ? "armadilha" : "magia"} data-size="completo">
      <div className={styles.header}>
        <span className={styles.name}>{card.nome}</span>
        <SpellTrapBadge tipo={card.tipo === "monstro" ? "magica" : card.tipo} />
      </div>
      <div className={styles.artWindow}>
        <CardArt art={art} label={card.nome} />
      </div>
      <div className={styles.footer}>
        <p>{card.descricao}</p>
      </div>
    </div>
  );
}
