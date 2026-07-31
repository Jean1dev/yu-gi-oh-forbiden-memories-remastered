import { createArtResolverFromCatalog } from "@yugioh/data/art";
import {
  DomainError,
  err,
  ok,
  type CardArtLookup,
  type Result,
} from "@yugioh/shared";

import { cardArtUrl } from "../card-art-url.ts";
import { getSealedCatalog, listAllCards } from "../catalog/sealed-catalog.ts";
import type { PasswordCatalog } from "./types.ts";

let memoized: Promise<Result<PasswordCatalog, DomainError>> | undefined;

async function loadOnce(): Promise<Result<PasswordCatalog, DomainError>> {
  const result = await getSealedCatalog();
  if (!result.ok) {
    memoized = undefined;
    return err(
      new DomainError(`Catalog unavailable: ${result.error.message}`, "catalog_unavailable", {
        cause: result.error.code,
      }),
    );
  }

  const catalog = result.value;
  const artResolver = createArtResolverFromCatalog(catalog);
  const cards = listAllCards(catalog).filter((card) => card.password !== null);
  const artLookup: CardArtLookup = (cardNumber) => {
    const resolved = artResolver.resolve(cardNumber);
    return resolved.tipo === "arte"
      ? { kind: "art", path: cardArtUrl(cardNumber) }
      : { kind: "placeholder" };
  };

  return ok({ cards, artLookup });
}

export function getPasswordCatalog(): Promise<Result<PasswordCatalog, DomainError>> {
  memoized ??= loadOnce();
  return memoized;
}
