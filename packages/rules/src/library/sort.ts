import type { LibraryEntry, LibrarySort } from "@yugioh/shared";

type SortValue = string | number;

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US");
}

function sortableValue(entry: LibraryEntry, field: LibrarySort["field"]): SortValue | undefined {
  if (field === "numero") return entry.cardNumber;
  if (!entry.obtained) return undefined;
  if (field === "nome") return normalizeName(entry.card.nome);
  return entry.card[field] ?? undefined;
}

function compareValues(left: SortValue, right: SortValue): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function sortLibraryEntries(
  entries: readonly LibraryEntry[],
  sort: LibrarySort,
): readonly LibraryEntry[] {
  return [...entries].sort((left, right) => {
    const leftValue = sortableValue(left, sort.field);
    const rightValue = sortableValue(right, sort.field);

    if (leftValue === undefined && rightValue !== undefined) return 1;
    if (leftValue !== undefined && rightValue === undefined) return -1;
    if (leftValue !== undefined && rightValue !== undefined) {
      const primary = compareValues(leftValue, rightValue);
      if (primary !== 0) return sort.direction === "asc" ? primary : -primary;
    }
    return compareValues(left.cardNumber, right.cardNumber);
  });
}
