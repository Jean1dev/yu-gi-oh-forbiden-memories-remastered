"use client";

import type { ArtReference, Card } from "@yugioh/shared";

import { CardArt } from "../library/card-art.tsx";
import { AttributeBadge } from "./attribute-badge.tsx";
import styles from "./monster-card-frame.module.css";

export type MonsterCardFrameProps = Readonly<{
  card: Card;
  art: ArtReference;
  size?: "completo" | "compacto";
}>;

const MAX_STARS = 12;

function stars(nivel: number | null | undefined): string {
  const count = Math.min(MAX_STARS, Math.max(0, nivel ?? 0));
  return "★".repeat(count);
}

function stat(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}

/** Renders a `Card` with `tipo: "monstro"` from parts, in the PS1-CRT gold frame (spec F04). */
export function MonsterCardFrame({ card, art, size = "completo" }: MonsterCardFrameProps) {
  const label = `${card.nome} (${stat(card.atk)}/${stat(card.def)})`;

  if (size === "compacto") {
    return (
      <div className={styles.frame} data-size="compacto">
        <div className={styles.artWindow}>
          <CardArt art={art} label={label} />
        </div>
        <div className={styles.compactFooter}>
          <span className={styles.name}>{card.nome}</span>
          <span className={styles.stats}>
            ATK {stat(card.atk)} / DEF {stat(card.def)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.frame} data-size="completo">
      <div className={styles.header}>
        <span className={styles.name}>{card.nome}</span>
        <AttributeBadge attribute={card.atributo ?? null} />
      </div>
      <div className={styles.levelRow} aria-label={`nível ${String(card.nivel ?? 0)}`}>
        {stars(card.nivel)}
      </div>
      <div className={styles.artWindow}>
        <CardArt art={art} label={label} />
      </div>
      <div className={styles.footer}>
        <div className={styles.description}>
          <p className={styles.race}>[{card.classe}]</p>
          <p>{card.descricao}</p>
        </div>
        <div className={styles.stats}>
          <p>ATK {stat(card.atk)}</p>
          <p>DEF {stat(card.def)}</p>
        </div>
      </div>
    </div>
  );
}
