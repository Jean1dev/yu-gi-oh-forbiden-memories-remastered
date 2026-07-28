import { createArtResolverFromCatalog } from "@yugioh/data/art";
import { loadCatalogFromDisk } from "@yugioh/data/catalog/disk";
import {
  CARD_TYPES,
  DomainError,
  err,
  ok,
  type Card,
  type CardArtLookup,
  type LibraryCatalogListing,
  type Result,
} from "@yugioh/shared";

export type LibraryCatalog = Readonly<{
  listing: LibraryCatalogListing;
  artLookup: CardArtLookup;
}>;

let memoized: Promise<Result<LibraryCatalog, DomainError>> | undefined;

async function loadOnce(): Promise<Result<LibraryCatalog, DomainError>> {
  const result = await loadCatalogFromDisk();
  if (!result.ok) {
    memoized = undefined;
    return err(
      new DomainError(`Catalog unavailable: ${result.error.message}`, "catalog_unavailable", {
        cause: result.error.code,
      }),
    );
  }

  const catalog = result.value;
  const artResolver = createArtResolverFromCatalog(catalog);

  // `CardCatalog` has no single "list every card" method of its own; composed
  // here from the five type indexes it already publishes, the same pattern
  // `loadCatalogAndPool` (build-deck/F02) used for `CardPoolLookup`.
  const listing: LibraryCatalogListing = {
    listAll() {
      const cards: Card[] = [];
      for (const tipo of CARD_TYPES) {
        cards.push(...catalog.listByTipo(tipo));
      }
      return cards;
    },
    totalCount() {
      return catalog.totalCount();
    },
  };

  const artLookup: CardArtLookup = (cardNumber) => {
    const resolved = artResolver.resolve(cardNumber);
    return resolved.tipo === "arte"
      ? { kind: "art", path: resolved.caminho }
      : { kind: "placeholder" };
  };

  return ok({ listing, artLookup });
}

/**
 * Loads the sealed catalog and the art resolver once per process and reuses
 * them on every later call (spec library/F01, Decision 5): both are
 * immutable for the process's lifetime, so re-reading them on every Library
 * opening would spend the PRD's 1s load budget for no benefit. A failed load
 * is not memoized — the next call retries from disk instead of repeating the
 * same failure forever, which is what lets `reload()` recover from a
 * transient read failure.
 */
export function getLibraryCatalog(): Promise<Result<LibraryCatalog, DomainError>> {
  memoized ??= loadOnce();
  return memoized;
}
