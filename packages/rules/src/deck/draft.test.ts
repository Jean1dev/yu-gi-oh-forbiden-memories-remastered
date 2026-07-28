import type { Collection, DeckDraft } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import {
  addCardToDraft,
  createActiveDeckLookupFromDraft,
  draftDivergesFromActiveDeck,
  removeCardFromDraft,
  totalCardsInDraft,
} from "./draft.ts";

describe("addCardToDraft", () => {
  it("blocks with max_copies_limit when quantity owned is three or more and the draft already has three copies", () => {
    const draft: DeckDraft = new Map([["001", 3]]);
    const owned: Collection = new Map([["001", 5]]);

    const result = addCardToDraft(draft, owned, "001");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("max_copies_limit");
  });

  it("blocks with owned_quantity_limit when quantity owned is one or two and the draft already has that quantity", () => {
    const draft: DeckDraft = new Map([["001", 2]]);
    const owned: Collection = new Map([["001", 2]]);

    const result = addCardToDraft(draft, owned, "001");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("owned_quantity_limit");
    expect(!result.ok && result.error.details["quantityOwned"]).toBe(2);
  });

  it("blocks with card_not_owned when quantity owned is zero", () => {
    const draft: DeckDraft = new Map();
    const owned: Collection = new Map();

    const result = addCardToDraft(draft, owned, "001");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("card_not_owned");
  });

  it("adds successfully when below the limit and returns the draft with the incremented quantity", () => {
    const draft: DeckDraft = new Map([["001", 1]]);
    const owned: Collection = new Map([["001", 3]]);

    const result = addCardToDraft(draft, owned, "001");

    expect(result.ok).toBe(true);
    expect(result.ok && result.value.get("001")).toBe(2);
  });
});

describe("removeCardFromDraft", () => {
  it("decrements the quantity and removes the key once it reaches zero", () => {
    const draft: DeckDraft = new Map([["001", 1]]);

    const result = removeCardFromDraft(draft, "001");

    expect(result.ok).toBe(true);
    expect(result.ok && result.value.has("001")).toBe(false);
  });

  it("blocks with card_not_in_draft when the quantity is already zero", () => {
    const draft: DeckDraft = new Map();

    const result = removeCardFromDraft(draft, "001");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("card_not_in_draft");
  });
});

describe("totalCardsInDraft", () => {
  it("sums multiple cards with different quantities correctly", () => {
    const draft: DeckDraft = new Map([
      ["001", 3],
      ["045", 1],
      ["333", 2],
    ]);
    expect(totalCardsInDraft(draft)).toBe(6);
  });

  it("returns zero for an empty draft", () => {
    expect(totalCardsInDraft(new Map())).toBe(0);
  });
});

describe("draftDivergesFromActiveDeck", () => {
  it("returns false when both maps are identical", () => {
    const draft: DeckDraft = new Map([["001", 2]]);
    const original: DeckDraft = new Map([["001", 2]]);
    expect(draftDivergesFromActiveDeck(draft, original)).toBe(false);
  });

  it("returns true when any quantity changes between the maps", () => {
    const draft: DeckDraft = new Map([["001", 3]]);
    const original: DeckDraft = new Map([["001", 2]]);
    expect(draftDivergesFromActiveDeck(draft, original)).toBe(true);
  });

  it("returns true when a key is only present in one of the maps", () => {
    const draft: DeckDraft = new Map([
      ["001", 2],
      ["002", 1],
    ]);
    const original: DeckDraft = new Map([["001", 2]]);
    expect(draftDivergesFromActiveDeck(draft, original)).toBe(true);
  });
});

describe("createActiveDeckLookupFromDraft", () => {
  it("returns zero for a card absent from the draft", () => {
    const lookup = createActiveDeckLookupFromDraft(new Map());
    expect(lookup("001")).toBe(0);
  });

  it("returns the exact quantity for a card present in the draft", () => {
    const lookup = createActiveDeckLookupFromDraft(new Map([["001", 2]]));
    expect(lookup("001")).toBe(2);
  });
});
