import { getLibraryCatalog } from "../../lib/library/catalog-library.ts";
import { toCatalogPayload } from "../../lib/library/catalog-payload.ts";
import type { LibraryCatalogPayload } from "../../lib/library/types.ts";
import { LibraryClient } from "./library-client.tsx";

/**
 * Loads the sealed catalog server-side and hands it to the client as a plain
 * payload. `getLibraryCatalog` reaches the filesystem, so it can only run here
 * — never inside the `"use client"` boundary, which would drag `node:fs` into
 * the browser bundle. Same split `/build-deck` already uses (spec
 * build-deck/F04 §3, Fluxo step 5).
 *
 * Everything else the grid needs — the authenticated player and the locally
 * cached collection — still resolves client-side in `LibraryClient` (spec
 * library/F02, Decision 10), so nothing player-specific is rendered here.
 */
async function loadCatalogPayload(): Promise<LibraryCatalogPayload> {
  const result = await getLibraryCatalog();
  return result.ok ? toCatalogPayload(result.value) : { status: "error" };
}

export default async function LibraryPage() {
  return <LibraryClient catalogResult={await loadCatalogPayload()} />;
}
