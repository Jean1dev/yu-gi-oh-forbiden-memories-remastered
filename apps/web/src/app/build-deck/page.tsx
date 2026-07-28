import { loadCatalogFromDisk } from "@yugioh/data/catalog/disk";
import { CARD_TYPES, type Card } from "@yugioh/shared";

import { BuildDeckClient, type CatalogResult } from "./build-deck-client.tsx";

/**
 * Loads the full card catalog server-side — `loadCatalogFromDisk` touches the
 * filesystem, so it can only run here, never in the `"use client"` boundary
 * (`BuildDeckClient`) that needs it to enrich the collection (spec
 * build-deck/F04 §3, Fluxo step 5). `CardCatalog` has no single "list every
 * card" method, so this composes one from its five type indexes, the same
 * pattern `initial-deck/catalog-adapter.ts` (build-deck/F02) already uses for
 * `CardPoolLookup`.
 */
async function loadCatalogResult(): Promise<CatalogResult> {
  const result = await loadCatalogFromDisk();
  if (!result.ok) {
    return { status: "error" };
  }
  const catalog = result.value;
  const cards: Card[] = [];
  for (const tipo of CARD_TYPES) {
    cards.push(...catalog.listByTipo(tipo));
  }
  return { status: "ok", cards };
}

export default async function BuildDeckPage() {
  const catalogResult = await loadCatalogResult();
  return <BuildDeckClient catalogResult={catalogResult} />;
}
