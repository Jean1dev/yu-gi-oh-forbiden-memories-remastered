import { loadCatalogFromDisk } from "@yugioh/data/catalog/disk";
import type { CardCatalog } from "@yugioh/data/catalog";
import { CARD_TYPES, type Card, type DomainError, type Result } from "@yugioh/shared";

import { generatedDataDir } from "../server/repo-root.ts";

let memoized: Promise<Result<CardCatalog, DomainError>> | undefined;

/**
 * The app's single entry point to the sealed card catalog on disk.
 *
 * Server-only, and loaded **once per process**: the three features that need
 * the catalog (Library, Build Deck's collection panel, the initial-deck
 * bootstrap) used to call `loadCatalogFromDisk` independently, re-reading
 * ~230KB of JSON and re-validating it on every request that touched any of
 * them. The dataset is immutable for the process's lifetime, so there is
 * nothing to re-read.
 *
 * `generatedDir` is passed explicitly rather than left to the loader's default,
 * which derives it from `import.meta.url` — a value Next may rewrite to the
 * chunk's location under `.next/` when it bundles the module (see
 * `lib/server/repo-root.ts`).
 *
 * A failed load is not memoized: the next call retries from disk instead of
 * repeating the same failure for the process's lifetime, which is what lets the
 * Library's `reload()` recover from a transient read failure.
 */
export function getSealedCatalog(): Promise<Result<CardCatalog, DomainError>> {
  memoized ??= loadCatalogFromDisk({ generatedDir: generatedDataDir() }).then((result) => {
    if (!result.ok) {
      memoized = undefined;
    }
    return result;
  });
  return memoized;
}

/**
 * Every card in the catalog, ascending by `numero` within each type.
 *
 * `CardCatalog` publishes no "list every card" method of its own — this
 * composes one from the five type indexes it does publish, instead of widening
 * `banco-de-cartas`'s contract for a capability only the app needs. Lives here
 * because all three consumers were carrying their own copy of this loop.
 */
export function listAllCards(catalog: CardCatalog): readonly Card[] {
  const cards: Card[] = [];
  for (const tipo of CARD_TYPES) {
    cards.push(...catalog.listByTipo(tipo));
  }
  return cards;
}
