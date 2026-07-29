import type {
  Card,
  CardArtLookup,
  CardNumber,
  LibraryCatalogListing,
  ObtainedArtReference,
} from "@yugioh/shared";

/**
 * The catalog half of the Library, as `loadLibrary` consumes it.
 *
 * Declared here rather than beside its filesystem loader (`catalog-library.ts`)
 * so the client-side modules that only need the *shape* never have to name a
 * module that imports `node:fs`.
 */
export type LibraryCatalog = Readonly<{
  listing: LibraryCatalogListing;
  artLookup: CardArtLookup;
}>;

/**
 * The serializable form of {@link LibraryCatalog} that crosses the server →
 * client boundary as a prop.
 *
 * `listing` and `artLookup` are functions, so they cannot travel; the flat card
 * list and the resolved art per card can, and `fromCatalogPayload` rebuilds the
 * two lookups on the other side. Same shape and same reason as `CatalogResult`
 * in build-deck/F04, which passes the catalog into `BuildDeckClient` this way.
 */
export type LibraryCatalogPayload =
  | Readonly<{
      status: "ok";
      cards: readonly Card[];
      arts: Readonly<Record<CardNumber, ObtainedArtReference>>;
    }>
  | Readonly<{ status: "error" }>;
