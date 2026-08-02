import { UNPRICED_CARD_STARS, type Card, type CardPrice } from "@yugioh/shared";

export const resolveCardPrice = (card: Card): CardPrice =>
  card.estrelas === null
    ? { stars: UNPRICED_CARD_STARS, source: "fallback" }
    : { stars: card.estrelas, source: "catalog" };
