/**
 * Closed vocabulary of the card domain. Single source of truth for the whole
 * monorepo: no other package redeclares these lists.
 *
 * The string values are the ones the source dataset uses, so they stay in
 * Portuguese — they are data, not identifiers.
 */

/**
 * The five card types of Forbidden Memories. `ritual` is a first-class type,
 * not a variation of `magica` (product.md; PRD banco-de-cartas §6 F01).
 */
export const CARD_TYPES = ["monstro", "armadilha", "equipamento", "magica", "ritual"] as const;

/**
 * The ten Guardian Stars, axis of the 10x10 compatibility matrix
 * (docs/arquitetura.md §4.2). The matrix *values* are pending external data and
 * do not live here.
 */
export const GUARDIAN_STARS = [
  "Sun",
  "Moon",
  "Mars",
  "Jupiter",
  "Mercury",
  "Neptune",
  "Pluto",
  "Saturn",
  "Uranus",
  "Venus",
] as const;

/**
 * Canonical card count of the game. Settles the "821 vs 722" divergence raised
 * in PRD §2: 821 counts *source files* and only ever appears in the ingestion
 * report; 722 counts *cards*.
 */
export const CANONICAL_CARD_TOTAL = 722;

/** Fixed width of a card number, zero-padded on the left. */
export const CARD_NUMBER_LENGTH = 3;

/**
 * Canonical key order of a serialized card. This is what makes `cards.json`
 * byte-deterministic (spec F01 §3, a precondition for the F10 content hash).
 */
export const CARD_FIELD_ORDER = [
  "id",
  "numero",
  "nome",
  "img",
  "classe",
  "atk",
  "def",
  "guardiao1",
  "guardiao2",
  "password",
  "estrelas",
  "tipo",
] as const;
