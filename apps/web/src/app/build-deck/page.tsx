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
