import type { Card, CardNumber } from "@yugioh/shared";

import { normalizeCardNumber } from "./normalize-card.ts";

/** Maps a card number to the relative path of its art file. */
export type ArtManifest = Readonly<Record<CardNumber, string>>;

export type ArtManifestResult = Readonly<{
  /** Contains an entry only for art that actually exists on disk. */
  manifest: ArtManifest;
  /** Emitted cards with no matching art file, ascending. */
  missingArts: readonly CardNumber[];
  /** Art files with no matching card, sorted. */
  orphanArts: readonly string[];
}>;

const ART_FILE_PATTERN = /^([0-9]+)\.[A-Za-z0-9]+$/;

function baseName(path: string): string {
  const lastSeparator = path.lastIndexOf("/");
  return lastSeparator === -1 ? path : path.slice(lastSeparator + 1);
}

/**
 * Derives the card number an art file belongs to, or `null` when the file name
 * is not a card number at all.
 */
function cardNumberFromArtPath(path: string): CardNumber | null {
  const match = ART_FILE_PATTERN.exec(baseName(path));
  if (match?.[1] === undefined) {
    return null;
  }
  return normalizeCardNumber(match[1]);
}

/**
 * Crosses the emitted cards against the available art files.
 *
 * The manifest lists only what exists; a card without art is reported so F02
 * can rule on coverage, and the placeholder fallback is F04's job. Art without
 * a card never blocks — it is reported and ignored.
 *
 * `availableArts` are paths relative to the repository root, so the manifest can
 * be consumed without knowing where the ingestion ran from.
 */
export function buildArtManifest(
  cards: readonly Card[],
  availableArts: readonly string[],
): ArtManifestResult {
  const artByNumber = new Map<CardNumber, string>();
  const unmatchedArts = new Set<string>();

  for (const path of availableArts) {
    const numero = cardNumberFromArtPath(path);
    if (numero === null) {
      unmatchedArts.add(path);
      continue;
    }
    // First path wins so the result does not depend on directory read order.
    const existing = artByNumber.get(numero);
    if (existing === undefined || path.localeCompare(existing) < 0) {
      if (existing !== undefined) {
        unmatchedArts.add(existing);
      }
      artByNumber.set(numero, path);
    } else {
      unmatchedArts.add(path);
    }
  }

  const manifest: Record<CardNumber, string> = {};
  const missingArts: CardNumber[] = [];

  for (const card of [...cards].sort((left, right) => left.numero.localeCompare(right.numero))) {
    const path = artByNumber.get(card.numero);
    if (path === undefined) {
      missingArts.push(card.numero);
      continue;
    }
    manifest[card.numero] = path;
    artByNumber.delete(card.numero);
  }

  for (const orphan of artByNumber.values()) {
    unmatchedArts.add(orphan);
  }

  return {
    manifest,
    missingArts,
    orphanArts: [...unmatchedArts].sort((left, right) => left.localeCompare(right)),
  };
}
