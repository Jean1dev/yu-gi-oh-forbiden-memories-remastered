"use client";

import {
  calculateProgress,
  filterLibrarySearch,
  hasNonDefaultLibraryFilters,
  normalizeLibrarySearchTerm,
  prepareLibrarySearch,
  queryLibraryEntries,
} from "@yugioh/rules";
import type { LoadedLibrary } from "@yugioh/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { CacheNotice } from "../../components/library/cache-notice.tsx";
import { CollectionGrid } from "../../components/library/collection-grid.tsx";
import { EmptyState } from "../../components/library/empty-state.tsx";
import { FilterBar } from "../../components/library/filter-bar.tsx";
import { FilterNoResults } from "../../components/library/filter-no-results.tsx";
import { GridSkeleton } from "../../components/library/grid-skeleton.tsx";
import { LibraryFailure } from "../../components/library/library-failure.tsx";
import { LIBRARY_MESSAGES } from "../../components/library/messages.ts";
import { ProgressIndicator } from "../../components/library/progress-indicator.tsx";
import { LibrarySearchField } from "../../components/library/search-field.tsx";
import { LibrarySearchNoResults } from "../../components/library/search-no-results.tsx";
import { useLibrary } from "../../hooks/use-library.ts";
import { useLibraryFilters } from "../../hooks/use-library-filters.ts";
import { fromCatalogPayload } from "../../lib/library/catalog-payload.ts";
import type { LibraryCatalogPayload } from "../../lib/library/types.ts";
import {
  applySearchToUrl,
  readSearchFromUrl,
  removeSearchFromUrl,
} from "../../lib/library/search-url.ts";

export type LibraryClientProps = Readonly<{
  /** Resolved server-side in `page.tsx` via `loadCatalogFromDisk` (fs access is server-only). */
  catalogResult: LibraryCatalogPayload;
}>;

function failureMessage(code: string): string {
  if (code === "catalog_unavailable") {
    return LIBRARY_MESSAGES.catalogUnavailable;
  }
  if (code === "session_missing") {
    return LIBRARY_MESSAGES.sessionMissing;
  }
  return LIBRARY_MESSAGES.collectionUnavailable;
}

function ReadyLibrary({
  loaded,
  pathname,
  queryString,
  replace,
}: Readonly<{
  loaded: LoadedLibrary;
  pathname: string;
  queryString: string;
  replace: ReturnType<typeof useRouter>["replace"];
}>) {
  const term = useMemo(() => readSearchFromUrl(new URLSearchParams(queryString)), [queryString]);
  const { index, collectionOrigin, syncedAt } = loaded;
  const { filters, setFilters, clearFilters } = useLibraryFilters();
  const progress = calculateProgress(index);
  const searchMatches = useMemo(
    () =>
      new Set(
        filterLibrarySearch(prepareLibrarySearch(index.entries), normalizeLibrarySearchTerm(term)),
      ),
    [index.entries, term],
  );
  const result = useMemo(
    () =>
      queryLibraryEntries({
        entries: index.entries,
        filters,
        ...(term.length === 0 ? {} : { search: (entry) => searchMatches.has(entry) }),
      }),
    [filters, index.entries, searchMatches, term.length],
  );

  function replaceSearch(nextParams: URLSearchParams): void {
    const nextQuery = nextParams.toString();
    replace(nextQuery.length === 0 ? pathname : `${pathname}?${nextQuery}`, {
      scroll: false,
    });
  }

  return (
    <>
      {collectionOrigin === "cache" ? <CacheNotice syncedAt={syncedAt} /> : null}
      <ProgressIndicator progress={progress} />
      {progress.obtained === 0 && filters.status === "obtidas" ? (
        <EmptyState />
      ) : (
        <>
          <FilterBar
            filters={filters}
            hasNonDefaultFilters={hasNonDefaultLibraryFilters(filters)}
            onChange={setFilters}
            onClear={clearFilters}
          />
          <LibrarySearchField
            term={term}
            onChange={(nextTerm) =>
              replaceSearch(applySearchToUrl(new URLSearchParams(queryString), nextTerm))
            }
            onClear={() => replaceSearch(removeSearchFromUrl(new URLSearchParams(queryString)))}
          />
          {result.entries.length === 0 && term.length > 0 ? (
            <LibrarySearchNoResults term={term} />
          ) : result.entries.length === 0 ? (
            <FilterNoResults />
          ) : (
            <CollectionGrid
              entries={result.entries}
              emptyLabel={LIBRARY_MESSAGES.emptyCollection}
              detailQueryString={queryString}
            />
          )}
        </>
      )}
    </>
  );
}

/**
 * The state machine behind `/library` (spec library/F02 §3). `useLibrary`
 * (library/F01) exposes only `loading | ready | error` — the spec's five
 * conceptual states (loading, catalog failure, collection failure, empty,
 * ready) collapse onto that real contract: the two failure states share the
 * `"error"` branch, distinguished by `DomainError.code` via
 * {@link failureMessage}, and "empty" is `ready` with `progress.obtained
 * === 0`, computed here rather than reported by the hook.
 *
 * A catalog failure never mounts the grid (PRD library §6 F01 Error
 * Handling); a collection failure shows the same failure state, so no card
 * is ever rendered as obtained while the collection could not be read.
 *
 * The catalog arrives as a prop and is rehydrated into its two lookups here,
 * the same composition `BuildDeckClient` does with `buildCatalogLookup`: the
 * loader reads the filesystem, so it can only run in `page.tsx`.
 */
export function LibraryClient({ catalogResult }: LibraryClientProps) {
  const catalog = useMemo(() => fromCatalogPayload(catalogResult), [catalogResult]);
  const state = useLibrary(catalog);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  if (state.status === "loading") {
    return <GridSkeleton />;
  }

  if (state.status === "error") {
    return <LibraryFailure message={failureMessage(state.error.code)} onReload={state.reload} />;
  }

  return (
    <ReadyLibrary
      loaded={state.loaded}
      pathname={pathname}
      queryString={queryString}
      replace={router.replace}
    />
  );
}
