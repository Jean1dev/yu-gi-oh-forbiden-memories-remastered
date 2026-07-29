import type { LibraryEntry } from "@yugioh/shared";

import { CardCell } from "./card-cell.tsx";
import styles from "./collection-grid.module.css";

export type CollectionGridProps = Readonly<{
  /** Already cut and ordered by the caller (Decision 11) — the grid neither filters nor sorts. */
  entries: readonly LibraryEntry[];
  /** Shown instead of an empty list; not exercised by F02's own flow (`LibraryClient` renders `EmptyState` first), reserved for F04. */
  emptyLabel: string;
  /** Active Library query params carried into detail links so F05 can reconstruct the visible sequence. */
  detailQueryString?: string;
}>;

/**
 * A semantic list, one item per card, rendered in the order received — the
 * contract F03 and F04 fill without rewriting the grid (spec library/F02
 * §3, §4). Column count follows the available space, not a breakpoint list
 * (see `collection-grid.module.css`).
 */
export function CollectionGrid({ entries, emptyLabel, detailQueryString }: CollectionGridProps) {
  if (entries.length === 0) {
    return <p role="status">{emptyLabel}</p>;
  }

  return (
    <ul className={styles.grid} aria-label="Cartas">
      {entries.map((entry) => (
        <CardCell
          key={entry.cardNumber}
          entry={entry}
          {...(detailQueryString === undefined ? {} : { detailQueryString })}
        />
      ))}
    </ul>
  );
}
