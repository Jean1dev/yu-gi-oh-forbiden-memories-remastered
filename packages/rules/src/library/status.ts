import type { CollectionStatusFilter, LibraryEntry } from "@yugioh/shared";

export function filterByCollectionStatus(
  entries: readonly LibraryEntry[],
  status: CollectionStatusFilter,
): readonly LibraryEntry[] {
  if (status === "todas") return [...entries];
  const obtained = status === "obtidas";
  return entries.filter((entry) => entry.obtained === obtained);
}
