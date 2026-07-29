import type { CardNumber } from "../card/types.ts";
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

/**
 * The closed vocabulary of violations `validateDeckDraft` (build-deck/F06)
 * can report against the draft currently in edition. Distinct from
 * `DeckViolation` (`./types.ts`): that one is `free-duel`/F02's
 * forward-declared contract for validating an already-assembled
 * `DeckComposition`/`ReadyDeck` (structure only); this one also checks the
 * draft against what the player owns, a rule specific to `build-deck` (spec
 * build-deck/F06 §3).
 */
export type DeckDraftViolation =
  | Readonly<{ type: "insufficient_total"; missing: number }>
  | Readonly<{ type: "excessive_total"; excess: number }>
  | Readonly<{ type: "copy_limit_exceeded"; cardNumber: CardNumber; quantityInDraft: number }>
  | Readonly<{
      type: "exceeds_owned_quantity";
      cardNumber: CardNumber;
      quantityInDraft: number;
      quantityOwned: number;
    }>;

/**
 * Outcome of `validateDeckDraft` (spec build-deck/F06 §3): `valid` iff
 * `violations` is empty; `total` is `totalCardsInDraft(draft)`, included so
 * the UI can show `X/40` without recalculating it.
 */
export type DeckDraftValidationResult = Readonly<{
  valid: boolean;
  total: number;
  violations: readonly DeckDraftViolation[];
}>;
