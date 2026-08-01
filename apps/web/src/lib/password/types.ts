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
}>;

export type PasswordCatalogLookup = Readonly<{
  lookup: PasswordCardLookup;
  artLookup: CardArtLookup;
}>;

export type PasswordCatalogPayload =
  | Readonly<{
      status: "ok";
      cards: readonly Card[];
      arts: Readonly<Record<CardNumber, ObtainedArtReference>>;
    }>
  | Readonly<{ status: "error" }>;
