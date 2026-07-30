"use client";

import { DEFAULT_LIBRARY_FILTERS, type LibraryFilters } from "@yugioh/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import {
  clearLibraryFiltersUrl,
  parseLibraryFiltersUrl,
  serializeLibraryFiltersUrl,
} from "../lib/library/filters-url.ts";
import { log } from "../lib/logging.ts";

export type UseLibraryFiltersResult = Readonly<{
  filters: LibraryFilters;
  setFilters: (filters: LibraryFilters) => void;
  clearFilters: () => void;
}>;

export function useLibraryFilters(): UseLibraryFiltersResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const parsed = useMemo(
    () => parseLibraryFiltersUrl(new URLSearchParams(queryString)),
    [queryString],
  );

  useEffect(() => {
    for (const discarded of parsed.discarded) {
      log("warn", "library_filter_param_discarded", discarded);
    }
  }, [parsed]);

  function replace(next: URLSearchParams): void {
    const query = next.toString();
    router.replace(query.length === 0 ? pathname : `${pathname}?${query}`, { scroll: false });
  }

  return {
    filters: parsed.filters,
    setFilters: (filters) =>
      replace(serializeLibraryFiltersUrl(filters, new URLSearchParams(queryString))),
    clearFilters: () => replace(clearLibraryFiltersUrl(new URLSearchParams(queryString))),
  };
}

export { DEFAULT_LIBRARY_FILTERS };
