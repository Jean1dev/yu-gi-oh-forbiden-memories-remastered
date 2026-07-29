import type { CardNumber, DeckComposition } from "@yugioh/shared";

export function totalCards(composition: DeckComposition): number {
  return Object.values(composition).reduce((total, quantity) => total + quantity, 0);
}

export function expandComposition(composition: DeckComposition): readonly CardNumber[] {
  return Object.keys(composition)
    .sort()
    .flatMap((cardNumber) =>
      Array.from({ length: composition[cardNumber] ?? 0 }, () => cardNumber),
    );
}

export function groupIntoComposition(cardNumbers: readonly CardNumber[]): DeckComposition {
  return cardNumbers.reduce<Record<CardNumber, number>>((composition, cardNumber) => {
    composition[cardNumber] = (composition[cardNumber] ?? 0) + 1;
    return composition;
  }, {});
}
