import type {
  BuildDeckCollectionFilters,
  BuildDeckCollectionQuery,
  BuildDeckCollectionSort,
  CollectionItem,
} from "@yugioh/shared";

import { searchByName } from "./search.ts";

type SortValue = string | number;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US");
}

function matchesFilters<T extends CollectionItem>(
  item: T,
  filters: BuildDeckCollectionFilters,
): boolean {
  if (filters.cardType !== undefined && item.card.tipo !== filters.cardType) {
    return false;
  }
  if (filters.cardClass !== undefined && item.card.classe !== filters.cardClass) {
    return false;
  }
  if (
    filters.guardian !== undefined &&
    item.card.guardiao1 !== filters.guardian &&
    item.card.guardiao2 !== filters.guardian
  ) {
    return false;
  }
  return true;
}

function sortableValue<T extends CollectionItem>(
  item: T,
  field: BuildDeckCollectionSort["field"],
): SortValue | undefined {
  switch (field) {
    case "numero":
      return item.card.numero;
    case "nome":
      return normalizeText(item.card.nome);
    case "atk":
      return item.card.atk ?? undefined;
    case "def":
      return item.card.def ?? undefined;
    case "estrelas":
      return item.card.estrelas ?? undefined;
    case "quantity":
      return item.quantity;
  }
}

function compareValues(left: SortValue, right: SortValue): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function filterCollectionItems<T extends CollectionItem>(
  items: readonly T[],
  filters: BuildDeckCollectionFilters,
): readonly T[] {
  return items.filter((item) => matchesFilters(item, filters));
}

export function sortCollectionItems<T extends CollectionItem>(
  items: readonly T[],
  sort: BuildDeckCollectionSort,
): readonly T[] {
  return [...items].sort((left, right) => {
    const leftValue = sortableValue(left, sort.field);
    const rightValue = sortableValue(right, sort.field);

    if (leftValue === undefined && rightValue !== undefined) return 1;
    if (leftValue !== undefined && rightValue === undefined) return -1;
    if (leftValue !== undefined && rightValue !== undefined) {
      const primary = compareValues(leftValue, rightValue);
      if (primary !== 0) return sort.direction === "asc" ? primary : -primary;
    }
    return compareValues(left.card.numero, right.card.numero);
  });
}

export function queryCollectionItems<T extends CollectionItem>(
  items: readonly T[],
  query: BuildDeckCollectionQuery,
): readonly T[] {
  const bySearch = searchByName(items, query.term);
  const byFilters = filterCollectionItems(bySearch, query.filters);
  return sortCollectionItems(byFilters, query.sort);
}
