import {
  DEFAULT_LIBRARY_FILTERS,
  type LibraryEntry,
  type LibraryFilters,
  type LibraryQueryResult,
} from "@yugioh/shared";

import { filterByCollectionStatus } from "./status.ts";
import { sortLibraryEntries } from "./sort.ts";
import { filterByCardType } from "./type-filter.ts";

export type LibrarySearchPredicate = (entry: LibraryEntry) => boolean;

export type LibraryQueryInput = Readonly<{
  entries: readonly LibraryEntry[];
  filters: LibraryFilters;
  search?: LibrarySearchPredicate;
}>;

export function hasNonDefaultLibraryFilters(filters: LibraryFilters): boolean {
  return (
    filters.types.length > 0 ||
    filters.status !== DEFAULT_LIBRARY_FILTERS.status ||
    filters.sort.field !== DEFAULT_LIBRARY_FILTERS.sort.field ||
    filters.sort.direction !== DEFAULT_LIBRARY_FILTERS.sort.direction
  );
}

export function queryLibraryEntries(input: LibraryQueryInput): LibraryQueryResult {
  const byStatus = filterByCollectionStatus(input.entries, input.filters.status);
  const byType = filterByCardType(byStatus, input.filters.types);
  const bySearch = input.search === undefined ? byType : byType.filter(input.search);
  const entries = sortLibraryEntries(bySearch, input.filters.sort);

  return {
    entries,
    totalBefore: input.entries.length,
    totalAfter: entries.length,
    activeFilters: input.filters,
    hasNonDefaultFilters: hasNonDefaultLibraryFilters(input.filters),
  };
}
