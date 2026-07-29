import { buildLibraryIndex, deriveOwnedCardNumbers } from "@yugioh/rules";
import {
  ok,
  type DomainError,
  type LoadedCollection,
  type LoadedLibrary,
  type Result,
} from "@yugioh/shared";

import type { LibraryCatalog } from "./types.ts";

export type LoadLibraryDeps = Readonly<{
  /** Expected to already memoize on its own (`getLibraryCatalog`) — this never caches it itself. */
  getCatalog(): Promise<Result<LibraryCatalog, DomainError>>;
  /** Reused from build-deck/F01: origin (server/cache) and `syncedAt` travel along with it. */
  loadCollection(): Promise<Result<LoadedCollection, DomainError>>;
}>;

/**
 * Orchestrates catalog + collection + the pure cross-reference into the one
 * entry point `useLibrary` calls (spec library/F01 §3, steps 1-10).
 *
 * The catalog is checked first: unavailable or unsealed and the collection is
 * never touched at all (PRD library §6 F01 Error Handling — "a Library nao
 * abre a grade sem o banco"). A collection failure returns its error
 * untouched instead of a synthesized code, and **no index is built** — the
 * fail-safe the PRD requires: no card is ever assumed obtained while the
 * collection could not be read (spec Decision 7).
 */
export async function loadLibrary(
  deps: LoadLibraryDeps,
): Promise<Result<LoadedLibrary, DomainError>> {
  const catalogResult = await deps.getCatalog();
  if (!catalogResult.ok) {
    return catalogResult;
  }

  const collectionResult = await deps.loadCollection();
  if (!collectionResult.ok) {
    return collectionResult;
  }

  const obtainedCardNumbers = deriveOwnedCardNumbers(collectionResult.value.collection);
  const index = buildLibraryIndex({
    catalog: catalogResult.value.listing,
    obtainedCardNumbers,
    artLookup: catalogResult.value.artLookup,
  });

  return ok({
    index,
    collectionOrigin: collectionResult.value.origin,
    syncedAt: collectionResult.value.syncedAt,
  });
}
