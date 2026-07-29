import {
  DomainError,
  err,
  ok,
  type CardCatalogLookup,
  type CardPoolLookup,
  type Result,
} from "@yugioh/shared";

import { getSealedCatalog, listAllCards } from "../catalog/sealed-catalog.ts";

export type CatalogAndPool = Readonly<{
  catalog: CardCatalogLookup;
  poolLookup: CardPoolLookup;
}>;

/**
 * Loads the real catalog (`banco-de-cartas`/F03, `packages/data`) and adapts
 * it into the two capabilities this feature's pure core consumes:
 * `CardCatalogLookup` (already published by F01) and `CardPoolLookup` (spec
 * build-deck/F02, Decision 4).
 *
 * A construction failure (missing or invalid dataset artifacts) becomes
 * `catalog_unavailable` — the same code F01 already uses for the same
 * condition — so `ensureInitialDeck` never has to special-case where the
 * failure came from.
 *
 * Server-only: the catalog is read from the filesystem, so this belongs to a
 * route handler or a server component, never to a `"use client"` module.
 */
export async function loadCatalogAndPool(): Promise<Result<CatalogAndPool, DomainError>> {
  const result = await getSealedCatalog();
  if (!result.ok) {
    return err(
      new DomainError(`Catalog unavailable: ${result.error.message}`, "catalog_unavailable", {
        cause: result.error.code,
      }),
    );
  }

  const catalog = result.value;
  const numbers = listAllCards(catalog).map((card) => card.numero);
  const poolLookup: CardPoolLookup = () => numbers;

  return ok({ catalog: catalog.getByNumero, poolLookup });
}
