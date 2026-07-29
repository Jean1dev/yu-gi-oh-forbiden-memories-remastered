import { loadCatalogFromDisk } from "@yugioh/data/catalog/disk";
import {
  CARD_TYPES,
  DomainError,
  err,
  ok,
  type CardCatalogLookup,
  type CardNumber,
  type CardPoolLookup,
  type Result,
} from "@yugioh/shared";

import { generatedDataDir } from "../server/repo-root.ts";

export type CatalogAndPool = Readonly<{
  catalog: CardCatalogLookup;
  poolLookup: CardPoolLookup;
}>;

/**
 * Loads the real catalog (`banco-de-cartas`/F03, `packages/data`) and adapts
 * it into the two capabilities this feature's pure core consumes:
 * `CardCatalogLookup` (already published by F01) and `CardPoolLookup` (spec
 * build-deck/F02, Decision 4). `CardCatalog` has no single "list every
 * number" method of its own — this composes one from the five type indexes
 * it already publishes (`listByTipo`) instead of widening `banco-de-cartas`'s
 * own contract for a capability only this feature needs.
 *
 * A construction failure (missing or invalid dataset artifacts) becomes
 * `catalog_unavailable` — the same code F01 already uses for the same
 * condition — so `ensureInitialDeck` never has to special-case where the
 * failure came from.
 *
 * Server-only: it reads the filesystem, so it belongs to a route handler or a
 * server component, never to a `"use client"` module.
 */
export async function loadCatalogAndPool(): Promise<Result<CatalogAndPool, DomainError>> {
  // Explicit `generatedDir` for the same reason `catalog-library.ts` passes one:
  // the loader's default is derived from `import.meta.url`, which a bundler may
  // rewrite (see `lib/server/repo-root.ts`).
  const result = await loadCatalogFromDisk({ generatedDir: generatedDataDir() });
  if (!result.ok) {
    return err(
      new DomainError(`Catalog unavailable: ${result.error.message}`, "catalog_unavailable", {
        cause: result.error.code,
      }),
    );
  }

  const catalog = result.value;
  const poolLookup: CardPoolLookup = () => {
    const numbers: CardNumber[] = [];
    for (const tipo of CARD_TYPES) {
      for (const card of catalog.listByTipo(tipo)) {
        numbers.push(card.numero);
      }
    }
    return numbers;
  };

  return ok({ catalog: catalog.getByNumero, poolLookup });
}
