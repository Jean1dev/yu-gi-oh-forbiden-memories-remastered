import { loadCatalogFromDisk } from "@yugioh/data/catalog/disk";
import { CARD_TYPES, type Card } from "@yugioh/shared";

import { generatedDataDir } from "../../lib/server/repo-root.ts";
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
  // Explicit `generatedDir`: the loader's default is derived from
  // `import.meta.url`, which Next may rewrite when it bundles the module
  // (see `lib/server/repo-root.ts`).
  const result = await loadCatalogFromDisk({ generatedDir: generatedDataDir() });
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
  // The page frame lives here rather than in `BuildDeckClient`, whose every
  // branch (failure, skeleton, empty collection, editor) returns a fragment —
  // wrapping once at the route keeps all of them inside the same container.
  return (
    <main className="page">
      <h1>Build Deck</h1>
      <BuildDeckClient catalogResult={catalogResult} />
    </main>
  );
}
