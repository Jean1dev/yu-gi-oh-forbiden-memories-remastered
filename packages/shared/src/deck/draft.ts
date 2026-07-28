import type { Collection } from "../collection/types.ts";

/**
 * The deck currently in edition: `cardNumber -> quantity in the draft`. Same
 * shape as `Collection` (build-deck/F01) and the active deck (build-deck/F02)
 * — three different roles, one shape, no new schema (spec build-deck/F05
 * Decision 6). Lives only in memory (Zustand store); never serialized on its
 * own.
 */
export type DeckDraft = Collection;

/**
 * The closed vocabulary of reasons `addCardToDraft`/`removeCardFromDraft` can
 * block an edit, mirroring the `DomainError.code` values those functions
 * return 1:1 (spec build-deck/F05 §3) — lets the UI switch on a known code
 * instead of inspecting a free-form string.
 */
export type DeckEditBlockReason =
  | "card_not_owned"
  | "owned_quantity_limit"
  | "max_copies_limit"
  | "card_not_in_draft";
