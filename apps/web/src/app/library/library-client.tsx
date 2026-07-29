"use client";

import { calculateProgress, onlyObtained } from "@yugioh/rules";

import { CacheNotice } from "../../components/library/cache-notice.tsx";
import { CollectionGrid } from "../../components/library/collection-grid.tsx";
import { EmptyState } from "../../components/library/empty-state.tsx";
import { GridSkeleton } from "../../components/library/grid-skeleton.tsx";
import { LibraryFailure } from "../../components/library/library-failure.tsx";
import { LIBRARY_MESSAGES } from "../../components/library/messages.ts";
import { ProgressIndicator } from "../../components/library/progress-indicator.tsx";
import { useLibrary } from "../../hooks/use-library.ts";

function failureMessage(code: string): string {
  if (code === "catalog_unavailable") {
    return LIBRARY_MESSAGES.catalogUnavailable;
  }
  if (code === "session_missing") {
    return LIBRARY_MESSAGES.sessionMissing;
  }
  return LIBRARY_MESSAGES.collectionUnavailable;
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
 */
export function LibraryClient() {
  const state = useLibrary();

  if (state.status === "loading") {
    return <GridSkeleton />;
  }

  if (state.status === "error") {
    return <LibraryFailure message={failureMessage(state.error.code)} onReload={state.reload} />;
  }

  const { index, collectionOrigin, syncedAt } = state.loaded;
  const progress = calculateProgress(index);
  const entries = onlyObtained(index.entries);

  return (
    <>
      {collectionOrigin === "cache" ? <CacheNotice syncedAt={syncedAt} /> : null}
      <ProgressIndicator progress={progress} />
      {progress.obtained === 0 ? (
        <EmptyState />
      ) : (
        <CollectionGrid entries={entries} emptyLabel={LIBRARY_MESSAGES.emptyCollection} />
      )}
    </>
  );
}
