import type { CardNumber, LibraryEntry } from "@yugioh/shared";

export const LIBRARY_SEARCH_TERM_MAX_LENGTH = 80;

export type NormalizedLibrarySearchTerm = Readonly<{
  originalText: string;
  nameText: string;
  cardNumber?: CardNumber;
  empty: boolean;
}>;

export type LibrarySearchEntry = Readonly<{
  entry: LibraryEntry;
  cardNumber: CardNumber;
  normalizedName?: string;
}>;

export type LibrarySearchIndex = readonly LibrarySearchEntry[];

function normalizeForName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/\s+/gu, " ");
}

export function normalizeLibrarySearchTerm(term: string): NormalizedLibrarySearchTerm {
  const originalText = term.trim().slice(0, LIBRARY_SEARCH_TERM_MAX_LENGTH);
  const nameText = normalizeForName(originalText);
  const numericValue = /^\d{1,3}$/u.test(originalText) ? Number(originalText) : 0;
  const cardNumber =
    numericValue > 0 ? (String(numericValue).padStart(3, "0") as CardNumber) : undefined;

  return {
    originalText,
    nameText,
    ...(cardNumber === undefined ? {} : { cardNumber }),
    empty: originalText.length === 0,
  };
}

export function prepareLibrarySearch(entries: readonly LibraryEntry[]): LibrarySearchIndex {
  return entries.map((entry) => ({
    entry,
    cardNumber: entry.cardNumber,
    ...(entry.obtained ? { normalizedName: normalizeForName(entry.card.nome) } : {}),
  }));
}

export function filterLibrarySearch(
  index: LibrarySearchIndex,
  term: NormalizedLibrarySearchTerm,
): readonly LibraryEntry[] {
  if (term.empty) {
    return index.map(({ entry }) => entry);
  }

  return index
    .filter(
      ({ cardNumber, normalizedName }) =>
        cardNumber === term.cardNumber ||
        (normalizedName !== undefined &&
          term.nameText.length > 0 &&
          normalizedName.includes(term.nameText)),
    )
    .map(({ entry }) => entry);
}
