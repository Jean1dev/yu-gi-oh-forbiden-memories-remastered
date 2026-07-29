import type {
  CardArtLookup,
  CardNumber,
  LibraryCatalogListing,
  ObtainedArtReference,
} from "@yugioh/shared";

import type { LibraryCatalog, LibraryCatalogPayload } from "./types.ts";

/**
 * Cached per catalog rather than per call: `getLibraryCatalog` memoizes one
 * catalog for the process's lifetime, and resolving art for all 722 cards on
 * every request to `/library` produces the identical payload each time. Keyed
 * weakly so a catalog dropped after a failed reload takes its payload with it.
 */
const payloads = new WeakMap<LibraryCatalog, LibraryCatalogPayload>();

/**
 * Flattens the catalog into the props `/library`'s page hands to its client
 * component. Called on the server only — its input comes from
 * `getLibraryCatalog`, which reads the disk.
 */
export function toCatalogPayload(catalog: LibraryCatalog): LibraryCatalogPayload {
  const cached = payloads.get(catalog);
  if (cached !== undefined) {
    return cached;
  }

  const cards = catalog.listing.listAll();
  const arts: Record<CardNumber, ObtainedArtReference> = {};
  for (const card of cards) {
    arts[card.numero] = catalog.artLookup(card.numero);
  }

  const payload: LibraryCatalogPayload = { status: "ok", cards, arts };
  payloads.set(catalog, payload);
  return payload;
}

/**
 * Rebuilds the two lookups on the client, mirroring `buildCatalogLookup`
 * (build-deck/F04). A card whose art did not travel resolves to the neutral
 * placeholder rather than throwing: `CardArt` already renders that case, and a
 * missing art is never a reason to fail the whole grid. The `hasOwn` guard is
 * what keeps an inherited key (`toString`, `__proto__`) from being mistaken for
 * an art entry — the payload arrives as a plain deserialized object.
 */
export function fromCatalogPayload(payload: LibraryCatalogPayload): LibraryCatalog | undefined {
  if (payload.status === "error") {
    return undefined;
  }

  const { cards, arts } = payload;
  const listing: LibraryCatalogListing = {
    listAll: () => cards,
    totalCount: () => cards.length,
  };
  const artLookup: CardArtLookup = (cardNumber) => {
    const art = Object.hasOwn(arts, cardNumber) ? arts[cardNumber] : undefined;
    return art ?? { kind: "placeholder" };
  };

  return { listing, artLookup };
}
