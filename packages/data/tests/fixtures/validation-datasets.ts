import {
  CANONICAL_CARD_TOTAL,
  CARD_NUMBER_LENGTH,
  type Card,
  type CardNumber,
} from "@yugioh/shared";

import type { ArtManifest } from "../../src/ingestion/art-manifest.ts";

/**
 * Synthetic datasets for the integrity gate. Built as plain canonical cards
 * rather than through the ingestion, so a test can express exactly the defect
 * it is about — including defects the ingestion would never emit.
 */

export function toCardNumber(value: number): CardNumber {
  return String(value).padStart(CARD_NUMBER_LENGTH, "0");
}

/** A valid monster: every field a monster must carry is filled. */
export function monsterCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: "89 63 11 39",
    estrelas: 999999,
    tipo: "monstro",
    atributo: null,
    nivel: null,
    descricao: null,
    ...overrides,
  };
}

/** A valid non-monster: the four monster-only fields are empty. */
export function nonMonsterCard(overrides: Partial<Card> = {}): Card {
  return {
    ...monsterCard(),
    numero: "700",
    nome: "Raigeki",
    classe: "Magic",
    atk: null,
    def: null,
    guardiao1: null,
    guardiao2: null,
    tipo: "magica",
    ...overrides,
  };
}

/** The canonical 722-card dataset, contiguous, with nothing wrong with it. */
export function validDataset(): readonly Card[] {
  return Array.from({ length: CANONICAL_CARD_TOTAL }, (_unused, index) =>
    monsterCard({ id: index + 1, numero: toCardNumber(index + 1) }),
  );
}

/** The manifest that covers a dataset completely. */
export function manifestFor(cards: readonly Card[]): ArtManifest {
  const manifest: Record<CardNumber, string> = {};
  for (const card of cards) {
    manifest[card.numero] = `cards-data/${card.numero}.jpg`;
  }
  return manifest;
}

/** The same dataset with the given numbers dropped, leaving holes in the range. */
export function datasetWithout(missing: readonly CardNumber[]): readonly Card[] {
  const dropped = new Set(missing);
  return validDataset().filter((card) => !dropped.has(card.numero));
}

/** A raw `cards.json` payload: cards as read from disk, still untyped. */
export function rawDataset(cards: readonly Card[]): unknown {
  return JSON.parse(JSON.stringify(cards)) as unknown;
}
