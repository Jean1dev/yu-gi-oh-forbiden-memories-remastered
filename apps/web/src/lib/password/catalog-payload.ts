import type { CardNumber, ObtainedArtReference } from "@yugioh/shared";

import type {
  PasswordCatalog,
  PasswordCatalogLookup,
  PasswordCatalogPayload,
} from "./types.ts";

const payloads = new WeakMap<PasswordCatalog, PasswordCatalogPayload>();

export function toPasswordPayload(catalog: PasswordCatalog): PasswordCatalogPayload {
  const cached = payloads.get(catalog);
  if (cached !== undefined) {
    return cached;
  }

  const cards = catalog.cards.filter((card) => card.password !== null);
  const arts: Record<CardNumber, ObtainedArtReference> = {};
  const cropArts: Record<CardNumber, ObtainedArtReference> = {};
  for (const card of cards) {
    arts[card.numero] = catalog.artLookup(card.numero);
    cropArts[card.numero] = catalog.cropArtLookup(card.numero);
  }

  const payload: PasswordCatalogPayload = { status: "ok", cards, arts, cropArts };
  payloads.set(catalog, payload);
  return payload;
}

export function fromPasswordPayload(
  payload: PasswordCatalogPayload,
): PasswordCatalogLookup | undefined {
  if (payload.status === "error") {
    return undefined;
  }

  const byPassword = new Map(
    payload.cards.flatMap((card) => (card.password === null ? [] : [[card.password, card] as const])),
  );

  return {
    lookup: (canonicalPassword) => byPassword.get(canonicalPassword),
    artLookup: (cardNumber) => {
      const art = Object.hasOwn(payload.arts, cardNumber)
        ? payload.arts[cardNumber]
        : undefined;
      return art ?? { kind: "placeholder" };
    },
    cropArtLookup: (cardNumber) => {
      const cropArt = Object.hasOwn(payload.cropArts, cardNumber)
        ? payload.cropArts[cardNumber]
        : undefined;
      return cropArt ?? { kind: "placeholder" };
    },
  };
}
