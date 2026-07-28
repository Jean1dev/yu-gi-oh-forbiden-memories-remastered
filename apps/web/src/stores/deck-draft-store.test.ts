import type { Collection, DeckDraft } from "@yugioh/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { useDeckDraftStore } from "./deck-draft-store.ts";

function resetStore(): void {
  useDeckDraftStore.setState({
    originalActiveDeck: new Map(),
    draft: new Map(),
    lastBlock: undefined,
  });
}

beforeEach(() => {
  resetStore();
});

describe("initializeDraft", () => {
  it("copies the active deck into both draft and originalActiveDeck", () => {
    const activeDeck: DeckDraft = new Map([["001", 2]]);

    useDeckDraftStore.getState().initializeDraft(activeDeck);

    expect(useDeckDraftStore.getState().draft).toEqual(activeDeck);
    expect(useDeckDraftStore.getState().originalActiveDeck).toEqual(activeDeck);
  });
});

describe("addCard/removeCard", () => {
  it("update only draft, never originalActiveDeck", () => {
    const activeDeck: DeckDraft = new Map([["001", 1]]);
    useDeckDraftStore.getState().initializeDraft(activeDeck);
    const owned: Collection = new Map([["001", 3]]);

    useDeckDraftStore.getState().addCard("001", owned);

    expect(useDeckDraftStore.getState().draft.get("001")).toBe(2);
    expect(useDeckDraftStore.getState().originalActiveDeck).toEqual(activeDeck);

    useDeckDraftStore.getState().removeCard("001");

    expect(useDeckDraftStore.getState().draft.get("001")).toBe(1);
    expect(useDeckDraftStore.getState().originalActiveDeck).toEqual(activeDeck);
  });

  it("sets lastBlock on a blocked addCard and clears it on the next successful action", () => {
    const owned: Collection = new Map();

    useDeckDraftStore.getState().addCard("001", owned);
    expect(useDeckDraftStore.getState().lastBlock?.code).toBe("card_not_owned");

    useDeckDraftStore.getState().addCard("002", new Map([["002", 1]]));
    expect(useDeckDraftStore.getState().lastBlock).toBeUndefined();
  });
});

describe("discardDraft", () => {
  it("restores draft to originalActiveDeck", () => {
    const activeDeck: DeckDraft = new Map([["001", 1]]);
    useDeckDraftStore.getState().initializeDraft(activeDeck);
    useDeckDraftStore.getState().addCard("001", new Map([["001", 3]]));
    expect(useDeckDraftStore.getState().draft.get("001")).toBe(2);

    useDeckDraftStore.getState().discardDraft();

    expect(useDeckDraftStore.getState().draft).toEqual(activeDeck);
  });
});
