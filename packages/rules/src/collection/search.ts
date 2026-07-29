import type { CollectionItem } from "@yugioh/shared";

/** Case/whitespace-insensitive normalization shared by both sides of the comparison. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Filters collection items by a substring of the card name, case-insensitive
 * and trimmed (spec build-deck/F04 §4). An empty or whitespace-only term
 * returns `items` unchanged. Preserves the relative order of `items` and
 * never mutates it. Generic over `T` so it composes after
 * {@link withDeckQuantity} without widening the result back down to the bare
 * `CollectionItem` shape (spec build-deck/F04 §3, Fluxo step 6).
 */
export function searchByName<T extends CollectionItem>(
  items: readonly T[],
  term: string,
): readonly T[] {
  const normalizedTerm = normalize(term);
  if (normalizedTerm === "") {
    return items;
  }
  return items.filter((item) => normalize(item.card.nome).includes(normalizedTerm));
}
