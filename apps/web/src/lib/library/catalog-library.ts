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

import { generatedDataDir } from "../server/repo-root.ts";
import type { LibraryCatalog } from "./types.ts";

let memoized: Promise<Result<LibraryCatalog, DomainError>> | undefined;

async function loadOnce(): Promise<Result<LibraryCatalog, DomainError>> {
  // `generatedDir` is passed explicitly: the loader's own default is derived
  // from `import.meta.url`, which Next may rewrite to a path inside `.next/`
  // when it bundles the module (see `lib/server/repo-root.ts`).
  const result = await loadCatalogFromDisk({ generatedDir: generatedDataDir() });
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

  // The manifest stores `cards-data/001.jpg` — a path relative to the
  // repository root, the coordinate system the ingestion pipeline works in. The
  // browser needs a URL, and a *relative* one would resolve differently on
  // `/library` than on `/library/001`, so it is anchored here, at the web layer's
  // edge, rather than changing what the dataset means. `/cards-data/[file]`
  // serves it (the URL `collection-card-item.tsx` already hard-codes).
  const artLookup: CardArtLookup = (cardNumber) => {
    const resolved = artResolver.resolve(cardNumber);
    return resolved.tipo === "arte"
      ? { kind: "art", path: `/${resolved.caminho}` }
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
