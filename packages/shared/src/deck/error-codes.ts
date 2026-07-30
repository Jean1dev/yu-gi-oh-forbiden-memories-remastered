export const DECK_ERROR_CODES = [
  "active_deck_missing",
  "active_deck_invalid",
  "active_deck_unavailable",
  "invalid_active_deck_line",
  "invalid_active_deck_snapshot",
] as const;
export type DeckErrorCode = (typeof DECK_ERROR_CODES)[number];
