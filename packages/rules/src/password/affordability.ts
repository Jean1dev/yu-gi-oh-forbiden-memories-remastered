import type { CardPrice, PasswordAffordability } from "@yugioh/shared";

export const evaluateAffordability = (
  price: CardPrice,
  balanceStars: number | undefined,
): PasswordAffordability => {
  if (balanceStars === undefined) {
    return { status: "unknown" };
  }

  if (balanceStars >= price.stars) {
    return { status: "affordable", balanceStars };
  }

  return {
    status: "insufficient",
    balanceStars,
    missingStars: price.stars - balanceStars,
  };
};
