import type { LibraryEntry } from "./types.ts";

export const LIBRARY_FILTER_TYPES = ["monstro", "magica", "armadilha", "equipamento"] as const;
export type LibraryFilterType = (typeof LIBRARY_FILTER_TYPES)[number];

export const COLLECTION_STATUS_FILTERS = ["obtidas", "nao-obtidas", "todas"] as const;
export type CollectionStatusFilter = (typeof COLLECTION_STATUS_FILTERS)[number];

export const LIBRARY_SORT_FIELDS = ["numero", "nome", "atk", "def", "estrelas"] as const;
export type LibrarySortField = (typeof LIBRARY_SORT_FIELDS)[number];

export const LIBRARY_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type LibrarySortDirection = (typeof LIBRARY_SORT_DIRECTIONS)[number];

export type LibrarySort = Readonly<{
  field: LibrarySortField;
  direction: LibrarySortDirection;
}>;

export type LibraryFilters = Readonly<{
  types: readonly LibraryFilterType[];
  status: CollectionStatusFilter;
  sort: LibrarySort;
}>;

export type LibraryQueryResult = Readonly<{
  entries: readonly LibraryEntry[];
  totalBefore: number;
  totalAfter: number;
  activeFilters: LibraryFilters;
  hasNonDefaultFilters: boolean;
}>;

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  types: [],
  status: "obtidas",
  sort: { field: "numero", direction: "asc" },
};
