import type { Card, DatasetSeal } from "@yugioh/shared";

import type { ArtManifest } from "../../src/ingestion/art-manifest.ts";
import { manifestFor, monsterCard, nonMonsterCard, rawDataset } from "./validation-datasets.ts";

/**
 * Synthetic input for the catalog. Small on purpose: the point is to cover
 * every branch of the indexes — a class with two cards, a card whose two
 * Guardian Stars are the same, a type nobody carries, cards with and without a
 * password — which a 722-card dataset would only bury.
 */

const SEALED_AT = "2026-07-27T12:05:00.000Z";

export const VALID_SEAL: DatasetSeal = { valid: true, generatedAt: SEALED_AT };
export const INVALID_SEAL: DatasetSeal = { valid: false, generatedAt: SEALED_AT };

export const BLUE_EYES_PASSWORD = "89 63 11 39";
/** Well formed, and deliberately carried by no card in the fixture. */
export const UNKNOWN_PASSWORD = "00 00 00 00";

/**
 * Handed out deliberately unsorted: every ordering guarantee the catalog makes
 * has to survive the cards arriving in any order.
 */
export function catalogCards(): readonly Card[] {
  return [
    nonMonsterCard({
      id: 701,
      numero: "701",
      nome: "Trap Hole",
      classe: "Trap",
      tipo: "armadilha",
      password: null,
    }),
    monsterCard({
      id: 1,
      numero: "001",
      nome: "Blue-eyes White Dragon",
      classe: "Dragon",
      guardiao1: "Sun",
      guardiao2: "Mars",
      password: BLUE_EYES_PASSWORD,
    }),
    nonMonsterCard({
      id: 700,
      numero: "700",
      nome: "Raigeki",
      classe: "Magic",
      tipo: "magica",
      password: "12 58 07 40",
    }),
    monsterCard({
      id: 3,
      numero: "003",
      nome: "Celtic Guardian",
      classe: "Warrior",
      atk: 1400,
      def: 1200,
      guardiao1: "Moon",
      guardiao2: "Jupiter",
      password: "91 15 27 95",
    }),
    monsterCard({
      id: 2,
      numero: "002",
      nome: "Hitotsu-Me Giant",
      classe: "Beast-Warrior",
      atk: 1200,
      def: 1000,
      // The same star twice: the card carries one Guardian Star, listed once.
      guardiao1: "Mars",
      guardiao2: "Mars",
      password: null,
    }),
    nonMonsterCard({
      id: 702,
      numero: "702",
      nome: "Black Luster Ritual",
      classe: "Ritual",
      tipo: "ritual",
      password: null,
    }),
  ];
}

/** Same cards, as they come back off disk: parsed JSON, still untyped. */
export function rawCatalogCards(): unknown {
  return rawDataset(catalogCards());
}

/**
 * A dataset the seal still calls valid while one record no longer parses —
 * what a hand-edited `generated/cards.json` looks like from F03's side.
 */
export function rawCardsWithBrokenRecord(): unknown {
  const cards = JSON.parse(JSON.stringify(catalogCards())) as Record<string, unknown>[];
  const broken = cards[1];
  if (broken !== undefined) {
    broken["atk"] = "three thousand";
  }
  return cards;
}

/** The art manifest as F01 emits it: an entry per card, existing art only. */
export function catalogManifest(): ArtManifest {
  return manifestFor(catalogCards());
}
