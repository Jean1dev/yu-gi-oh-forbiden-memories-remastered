import type { CardType } from "@yugioh/shared";

import styles from "./spell-trap-badge.module.css";

export type SpellTrapBadgeProps = Readonly<{
  tipo: Exclude<CardType, "monstro">;
}>;

/** `armadilha` gets its own color; every other non-monster tipo reads as "magia" (spec F05, Decision 1). */
export function SpellTrapBadge({ tipo }: SpellTrapBadgeProps) {
  const isTrap = tipo === "armadilha";
  const label = isTrap ? "ARMADILHA" : "MAGIA";

  return (
    <span
      className={styles.badge}
      data-kind={isTrap ? "armadilha" : "magia"}
      role="img"
      aria-label={label}
    >
      {label}
    </span>
  );
}
