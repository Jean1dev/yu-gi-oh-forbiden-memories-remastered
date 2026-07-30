import type { LibraryEntry, LibraryFilterType } from "@yugioh/shared";

export function filterByCardType(
  entries: readonly LibraryEntry[],
  types: readonly LibraryFilterType[],
): readonly LibraryEntry[] {
  if (types.length === 0) return [...entries];
  const acceptedTypes: ReadonlySet<string> = new Set(types);
  return entries.filter((entry) => entry.obtained && acceptedTypes.has(entry.card.tipo));
}
