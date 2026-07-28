import type { CardNumber, CollectionProgress, LibraryEntry, LibraryIndex } from "@yugioh/shared";

/** `{ obtained, total }` of the index, ready for the "X of 722 obtained" indicator. */
export function calculateProgress(index: LibraryIndex): CollectionProgress {
  return Object.freeze({ obtained: index.obtained, total: index.total });
}

/** `undefined` for a `cardNumber` outside the catalog — never a synthesized empty entry. */
export function findEntry(index: LibraryIndex, cardNumber: CardNumber): LibraryEntry | undefined {
  return index.byCardNumber.get(cardNumber);
}

/** `false` for both a not-obtained card and a `cardNumber` the catalog does not recognize. */
export function isObtained(index: LibraryIndex, cardNumber: CardNumber): boolean {
  return findEntry(index, cardNumber)?.obtained ?? false;
}
