import type { CardType, GuardianStar } from "../card/types.ts";

export const BUILD_DECK_COLLECTION_SORT_FIELDS = [
  "numero",
  "nome",
  "atk",
  "def",
  "estrelas",
  "quantity",
] as const;
export type BuildDeckCollectionSortField = (typeof BUILD_DECK_COLLECTION_SORT_FIELDS)[number];

export const BUILD_DECK_COLLECTION_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type BuildDeckCollectionSortDirection =
  (typeof BUILD_DECK_COLLECTION_SORT_DIRECTIONS)[number];

export type BuildDeckCollectionSort = Readonly<{
  field: BuildDeckCollectionSortField;
  direction: BuildDeckCollectionSortDirection;
}>;

export type BuildDeckCollectionFilters = Readonly<{
  cardType: CardType | undefined;
  cardClass: string | undefined;
  guardian: GuardianStar | undefined;
}>;

export type BuildDeckCollectionQuery = Readonly<{
  term: string;
  filters: BuildDeckCollectionFilters;
  sort: BuildDeckCollectionSort;
}>;

export const DEFAULT_BUILD_DECK_COLLECTION_FILTERS: BuildDeckCollectionFilters = {
  cardType: undefined,
  cardClass: undefined,
  guardian: undefined,
};

export const DEFAULT_BUILD_DECK_COLLECTION_SORT: BuildDeckCollectionSort = {
  field: "numero",
  direction: "asc",
};
