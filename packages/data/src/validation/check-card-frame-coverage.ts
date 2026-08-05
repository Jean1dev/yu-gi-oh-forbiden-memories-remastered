import type { CardNumber } from "@yugioh/shared";

export type CardFrameCoverageInput = Readonly<{
  cardNumbers: readonly CardNumber[];
  enrichedNumbers: ReadonlySet<CardNumber>;
  validCropArtNumbers: ReadonlySet<CardNumber>;
  legacyArtNumbers: ReadonlySet<CardNumber>;
}>;

export type CardFrameCoverageReport = Readonly<{
  totalCards: number;
  migrated: readonly CardNumber[];
  legacyFallback: readonly CardNumber[];
  inconsistent: readonly CardNumber[];
  uncovered: readonly CardNumber[];
  legacyFilesEligibleForRemoval: readonly CardNumber[];
  complete: boolean;
}>;

/**
 * Classifies the renderable surface of every canonical card without touching
 * the filesystem. Adapters validate files before turning them into these sets.
 */
export function checkCardFrameCoverage(
  input: CardFrameCoverageInput,
): CardFrameCoverageReport {
  const migrated: CardNumber[] = [];
  const legacyFallback: CardNumber[] = [];
  const inconsistent: CardNumber[] = [];
  const uncovered: CardNumber[] = [];
  const legacyFilesEligibleForRemoval: CardNumber[] = [];

  const cardNumbers = [...input.cardNumbers].sort((left, right) => left.localeCompare(right));
  for (const numero of cardNumbers) {
    const enriched = input.enrichedNumbers.has(numero);
    const validCropArt = input.validCropArtNumbers.has(numero);
    const legacyArt = input.legacyArtNumbers.has(numero);

    if (enriched && validCropArt) {
      migrated.push(numero);
      if (legacyArt) legacyFilesEligibleForRemoval.push(numero);
      continue;
    }

    if (enriched !== validCropArt) {
      inconsistent.push(numero);
      continue;
    }

    if (legacyArt) {
      legacyFallback.push(numero);
    } else {
      uncovered.push(numero);
    }
  }

  return {
    totalCards: cardNumbers.length,
    migrated,
    legacyFallback,
    inconsistent,
    uncovered,
    legacyFilesEligibleForRemoval,
    complete:
      inconsistent.length === 0 &&
      uncovered.length === 0 &&
      migrated.length + legacyFallback.length === cardNumbers.length,
  };
}
