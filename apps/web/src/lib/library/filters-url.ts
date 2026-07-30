import {
  CollectionStatusFilterSchema,
  DEFAULT_LIBRARY_FILTERS,
  LibraryFilterTypeSchema,
  LibrarySortDirectionSchema,
  LibrarySortFieldSchema,
  type LibraryFilters,
  type LibraryFilterType,
} from "@yugioh/shared";

const FILTER_PARAM_NAMES = ["tipo", "status", "ordem", "direcao"] as const;

export type DiscardedLibraryFilterParam = Readonly<{
  parameter: (typeof FILTER_PARAM_NAMES)[number];
  value: string;
}>;

export type LibraryFiltersParseResult = Readonly<{
  filters: LibraryFilters;
  discarded: readonly DiscardedLibraryFilterParam[];
}>;

export function parseLibraryFiltersUrl(searchParams: URLSearchParams): LibraryFiltersParseResult {
  const discarded: DiscardedLibraryFilterParam[] = [];
  const types: LibraryFilterType[] = [];

  for (const value of searchParams.getAll("tipo")) {
    const parsed = LibraryFilterTypeSchema.safeParse(value);
    if (!parsed.success) {
      discarded.push({ parameter: "tipo", value });
    } else if (!types.includes(parsed.data)) {
      types.push(parsed.data);
    }
  }

  const statusResult = CollectionStatusFilterSchema.safeParse(searchParams.get("status"));
  const fieldResult = LibrarySortFieldSchema.safeParse(searchParams.get("ordem"));
  const directionResult = LibrarySortDirectionSchema.safeParse(searchParams.get("direcao"));

  function discardInvalid(
    parameter: "status" | "ordem" | "direcao",
    value: string | null,
    valid: boolean,
  ): void {
    if (value !== null && !valid) discarded.push({ parameter, value });
  }

  discardInvalid("status", searchParams.get("status"), statusResult.success);
  discardInvalid("ordem", searchParams.get("ordem"), fieldResult.success);
  discardInvalid("direcao", searchParams.get("direcao"), directionResult.success);

  return {
    filters: {
      types,
      status: statusResult.success ? statusResult.data : DEFAULT_LIBRARY_FILTERS.status,
      sort: {
        field: fieldResult.success ? fieldResult.data : DEFAULT_LIBRARY_FILTERS.sort.field,
        direction: directionResult.success
          ? directionResult.data
          : DEFAULT_LIBRARY_FILTERS.sort.direction,
      },
    },
    discarded,
  };
}

export function serializeLibraryFiltersUrl(
  filters: LibraryFilters,
  currentSearchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(currentSearchParams);
  for (const parameter of FILTER_PARAM_NAMES) next.delete(parameter);

  for (const type of [...new Set(filters.types)].sort()) next.append("tipo", type);
  if (filters.status !== DEFAULT_LIBRARY_FILTERS.status) next.set("status", filters.status);
  if (filters.sort.field !== DEFAULT_LIBRARY_FILTERS.sort.field) {
    next.set("ordem", filters.sort.field);
  }
  if (filters.sort.direction !== DEFAULT_LIBRARY_FILTERS.sort.direction) {
    next.set("direcao", filters.sort.direction);
  }
  return next;
}

export function clearLibraryFiltersUrl(searchParams: URLSearchParams): URLSearchParams {
  return serializeLibraryFiltersUrl(DEFAULT_LIBRARY_FILTERS, searchParams);
}
