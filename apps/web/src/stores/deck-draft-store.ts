import { addCardToDraft, removeCardFromDraft } from "@yugioh/rules";
import type { CardNumber, Collection, DeckDraft, DomainError } from "@yugioh/shared";
import { create } from "zustand";

import { log } from "../lib/logging.ts";

const EMPTY_DRAFT: DeckDraft = new Map();

export type DeckDraftStore = Readonly<{
  /** Snapshot of the active deck loaded on entry (build-deck/F02); never mutated by `addCard`/`removeCard`. */
  originalActiveDeck: DeckDraft;
  /** The deck in edition; every add/remove replaces this with a new map. */
  draft: DeckDraft;
  /** The error from the last blocked edit, cleared on the next successful one. */
  lastBlock: DomainError | undefined;
  initializeDraft(activeDeck: DeckDraft): void;
  addCard(cardNumber: CardNumber, ownedCollection: Collection): void;
  removeCard(cardNumber: CardNumber): void;
  /** Resets `draft` back to `originalActiveDeck` — used when the player confirms leaving without saving. */
  discardDraft(): void;
}>;

/**
 * The first real mutable client state in `build-deck` (spec build-deck/F05,
 * Decision 2) — chosen over plain `useState` because the draft must be read
 * from multiple independent hooks (`useDeckDraft`, the F04 panel's
 * `ActiveDeckLookup`) without prop-drilling. In-memory only: no persistence
 * middleware, since the draft is intentionally transient (Decision 3).
 */
export const useDeckDraftStore = create<DeckDraftStore>((set, get) => ({
  originalActiveDeck: EMPTY_DRAFT,
  draft: EMPTY_DRAFT,
  lastBlock: undefined,

  initializeDraft(activeDeck) {
    set({ originalActiveDeck: activeDeck, draft: activeDeck, lastBlock: undefined });
  },

  addCard(cardNumber, ownedCollection) {
    const result = addCardToDraft(get().draft, ownedCollection, cardNumber);
    if (result.ok) {
      set({ draft: result.value, lastBlock: undefined });
    } else {
      set({ lastBlock: result.error });
    }
  },

  removeCard(cardNumber) {
    const result = removeCardFromDraft(get().draft, cardNumber);
    if (result.ok) {
      set({ draft: result.value, lastBlock: undefined });
    } else {
      log("warn", "remove_card_from_draft_blocked", { cardNumber, code: result.error.code });
      set({ lastBlock: result.error });
    }
  },

  discardDraft() {
    set((state) => ({ draft: state.originalActiveDeck, lastBlock: undefined }));
  },
}));
