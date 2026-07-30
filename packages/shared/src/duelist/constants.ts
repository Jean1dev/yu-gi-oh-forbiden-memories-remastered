export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;

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
