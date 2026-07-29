import { createArtResolverFromCatalog } from "@yugioh/data/art";
import {
  DomainError,
  err,
  ok,
  type CardArtLookup,
  type LibraryCatalogListing,
  type Result,
} from "@yugioh/shared";

import { cardArtUrl } from "../card-art-url.ts";
import { getSealedCatalog, listAllCards } from "../catalog/sealed-catalog.ts";
import type { LibraryCatalog } from "./types.ts";

let memoized: Promise<Result<LibraryCatalog, DomainError>> | undefined;

async function loadOnce(): Promise<Result<LibraryCatalog, DomainError>> {
  const result = await getSealedCatalog();
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
  const cards = listAllCards(catalog);

  const listing: LibraryCatalogListing = {
    listAll: () => cards,
    totalCount: () => catalog.totalCount(),
  };

  // The manifest decides whether a card *has* art; `cardArtUrl` decides where
  // the browser fetches it from, so Build Deck and the Library address the same
  // file the same way.
  const artLookup: CardArtLookup = (cardNumber) => {
    const resolved = artResolver.resolve(cardNumber);
    return resolved.tipo === "arte" ? { kind: "art", path: cardArtUrl(cardNumber) } : { kind: "placeholder" };
  };

  return ok({ listing, artLookup });
}

/**
 * Adds the Library's view — a flat listing plus art resolution — on top of the
 * shared sealed catalog, once per process (spec library/F01, Decision 5): both
 * are immutable for the process's lifetime, so rebuilding them on every Library
 * opening would spend the PRD's 1s load budget for no benefit. A failed load is
 * not memoized — the next call retries, which is what lets `reload()` recover
 * from a transient read failure.
 */
export function getLibraryCatalog(): Promise<Result<LibraryCatalog, DomainError>> {
  memoized ??= loadOnce();
  return memoized;
}
