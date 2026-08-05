import type {
  Card,
  CardArtLookup,
  CardNumber,
  ObtainedArtReference,
  PasswordCardLookup,
} from "@yugioh/shared";

export type PasswordCatalog = Readonly<{
  cards: readonly Card[];
  artLookup: CardArtLookup;
  /** Crop art (`renderizacao-cartas/F06`) — `{kind:"placeholder"}` for a card not yet migrated. */
  cropArtLookup: CardArtLookup;
}>;

export type PasswordCatalogLookup = Readonly<{
  lookup: PasswordCardLookup;
  artLookup: CardArtLookup;
  cropArtLookup: CardArtLookup;
}>;

export type PasswordCatalogPayload =
  | Readonly<{
      status: "ok";
      cards: readonly Card[];
      arts: Readonly<Record<CardNumber, ObtainedArtReference>>;
      cropArts: Readonly<Record<CardNumber, ObtainedArtReference>>;
    }>
  | Readonly<{ status: "error" }>;
