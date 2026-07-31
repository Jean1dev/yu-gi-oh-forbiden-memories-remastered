import { getSealedCatalog, listAllCards } from "../../lib/catalog/sealed-catalog.ts";
import { BuildDeckClient, type CatalogResult } from "./build-deck-client.tsx";

/**
 * Loads the full card catalog server-side — the catalog is read from the
 * filesystem, so it can only happen here, never in the `"use client"` boundary
 * (`BuildDeckClient`) that needs it to enrich the collection (spec
 * build-deck/F04 §3, Fluxo step 5).
 */
async function loadCatalogResult(): Promise<CatalogResult> {
  const result = await getSealedCatalog();
  return result.ok ? { status: "ok", cards: listAllCards(result.value) } : { status: "error" };
}

export default async function BuildDeckPage() {
  const catalogResult = await loadCatalogResult();
  // The page frame lives here rather than in `BuildDeckClient`; `BuildDeckClient`
  // owns its own `<h1>` (paired with the live "N / 40" count in its header row)
  // since every one of its branches — failure, skeleton, empty collection,
  // editor — needs the same title above it.
  return (
    <main className="page">
      <BuildDeckClient catalogResult={catalogResult} />
    </main>
  );
}
