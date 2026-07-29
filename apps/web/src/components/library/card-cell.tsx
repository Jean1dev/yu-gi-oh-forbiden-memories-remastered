import type { LibraryEntry } from "@yugioh/shared";
import Link from "next/link";

import { CardArt } from "./card-art.tsx";
import styles from "./card-cell.module.css";

export type CardCellProps = Readonly<{ entry: LibraryEntry }>;

/**
 * The single fluid cell for both variants of `LibraryEntry` (spec
 * library/F02, Decision 3): one component, one focus tree, one target for
 * F03/F04/F05. The blocked branch cannot leak `nome`/`tipo`/`classe` because
 * the `obtained: false` variant carries none of those fields — the
 * restriction is enforced by the compiler, not by this component's
 * discipline (library/F01, Decision 2). The whole cell is the link to the
 * detail route in both cases (Decision 6).
 */
export function CardCell({ entry }: CardCellProps) {
  const href = `/library/${entry.cardNumber}`;

  if (!entry.obtained) {
    return (
      <li className={styles.cell}>
        <Link
          href={href}
          className={styles.link}
          aria-label={`Carta ${entry.cardNumber}, ainda não obtida`}
        >
          <CardArt art={entry.art} label="" />
          <span aria-hidden="true" className={styles.number}>
            {entry.cardNumber}
          </span>
          <span aria-hidden="true">???</span>
        </Link>
      </li>
    );
  }

  const { card } = entry;
  return (
    <li className={styles.cell}>
      <Link
        href={href}
        className={styles.link}
        aria-label={`${card.nome}, número ${entry.cardNumber}, ${card.tipo}`}
      >
        <CardArt art={entry.art} label={card.nome} />
        <span aria-hidden="true" className={styles.name} title={card.nome}>
          {card.nome}
        </span>
        <span aria-hidden="true" className={styles.number}>
          {entry.cardNumber}
        </span>
        <span aria-hidden="true" className={styles.typeClass}>
          {card.tipo} · {card.classe}
        </span>
      </Link>
    </li>
  );
}
