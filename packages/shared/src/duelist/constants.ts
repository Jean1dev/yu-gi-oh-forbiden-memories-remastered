export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;

/**
 * The three drop pools every Forbidden Memories duelist has, named as the
 * roster already stores them (`packages/data/data/duelists/*.json`). They map
 * onto the original's BCD, SAPow and SATec columns.
 *
 * Named here so the grade→reward table of `rating-engine/F03` does not scatter
 * bare string literals, and so renaming a tier has one place to change on the
 * rules side.
 *
 * Deliberately not annotated against `DropTierId`: that type lives in
 * `./types.ts`, which already imports this module, and `DropTierId` is `string`
 * anyway — so the annotation would buy nothing and cost an import cycle.
 */
export const FM_DROP_TIERS = {
  COMMON: "common",
  SA_POW: "sa-pow",
  SA_TEC: "sa-tec",
} as const;

export const ROSTER_ERROR_CODES = [
  "invalid_roster",
  "invalid_duelist_id",
  "duplicate_duelist_id",
  "invalid_duelist_name",
  "invalid_portrait",
  "invalid_difficulty_level",
  "invalid_difficulty_profile",
  "invalid_deck_size",
  "too_many_card_copies",
  "unknown_card",
  "duplicate_drop_tier",
  "empty_drop_tier",
  "unknown_duelist",
] as const;

export type RosterErrorCode = (typeof ROSTER_ERROR_CODES)[number];
