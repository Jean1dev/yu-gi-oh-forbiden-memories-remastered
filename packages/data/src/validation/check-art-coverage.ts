import type { Card, ValidationViolation } from "@yugioh/shared";

import type { ArtManifest } from "../ingestion/art-manifest.ts";

/**
 * Checks that every card has an image a consumer can actually render.
 *
 * Coverage is satisfied either by an entry in the manifest or by the default
 * placeholder — but only when that placeholder really exists: accepting a
 * fallback nobody put on disk would sell coverage the UI cannot deliver
 * (spec F02, Decision 5). Whether the file exists is decided by the adapter,
 * because this core never touches the filesystem.
 *
 * Orphan art (a file with no card) is not judged here: F01 already reports it
 * and it cannot break a consumer (spec F02, Decision 8).
 */
export function checkArtCoverage(
  cards: readonly Card[],
  manifest: ArtManifest,
  placeholderExists: boolean,
): readonly ValidationViolation[] {
  if (placeholderExists) {
    return [];
  }

  return cards
    .filter((card) => manifest[card.numero] === undefined)
    .map((card) => ({
      category: "arte" as const,
      numero: card.numero,
      code: "missing_art_without_placeholder",
      message: `Card ${card.numero}: art missing and no placeholder available.`,
    }));
}
