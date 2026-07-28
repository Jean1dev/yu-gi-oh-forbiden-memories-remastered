// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import type { DeckDraft } from "@yugioh/shared";
import { DomainError } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import type { CollectionState } from "./use-collection.ts";
import { useCollection } from "./use-collection.ts";
import type { UseDeckDraftResult } from "./use-deck-draft.ts";
import { useDeckDraft } from "./use-deck-draft.ts";
import { useDeckValidation } from "./use-deck-validation.ts";

vi.mock("./use-collection.ts", () => ({
  useCollection: vi.fn(),
}));
vi.mock("./use-deck-draft.ts", () => ({
  useDeckDraft: vi.fn(),
}));

const mockedUseCollection = vi.mocked(useCollection);
const mockedUseDeckDraft = vi.mocked(useDeckDraft);

function deckDraftResult(draft: DeckDraft): UseDeckDraftResult {
  let total = 0;
  for (const quantity of draft.values()) {
    total += quantity;
  }
  return {
    draft,
    total,
    lastBlock: undefined,
    activeDeckLookup: (cardNumber) => draft.get(cardNumber) ?? 0,
    hasUnsavedChanges: false,
    canAddCard: true,
    addCard: vi.fn(),
    removeCard: vi.fn(),
  };
}

describe("useDeckValidation", () => {
  it("returns the neutral loading state while the collection is loading", () => {
    mockedUseDeckDraft.mockReturnValue(deckDraftResult(new Map([["001", 3]])));
    mockedUseCollection.mockReturnValue({ status: "loading" });

    const { result } = renderHook(() => useDeckValidation());

    expect(result.current).toEqual({ valid: false, total: 3, violations: [], loading: true });
  });

  it("returns the neutral loading state when the collection failed to load", () => {
    mockedUseDeckDraft.mockReturnValue(deckDraftResult(new Map([["001", 3]])));
    mockedUseCollection.mockReturnValue({
      status: "error",
      error: new DomainError("boom", "collection_unavailable"),
    } as CollectionState);

    const { result } = renderHook(() => useDeckValidation());

    expect(result.current).toEqual({ valid: false, total: 3, violations: [], loading: true });
  });

  it("returns the real validation result once the collection is ready", () => {
    mockedUseDeckDraft.mockReturnValue(deckDraftResult(new Map([["001", 3]])));
    mockedUseCollection.mockReturnValue({
      status: "ready",
      loaded: { origin: "server", collection: new Map([["001", 1]]), syncedAt: "2026-07-28T00:00:00.000Z" },
    } as CollectionState);

    const { result } = renderHook(() => useDeckValidation());

    expect(result.current.loading).toBe(false);
    expect(result.current.valid).toBe(false);
    expect(result.current.violations).toContainEqual({
      type: "exceeds_owned_quantity",
      cardNumber: "001",
      quantityInDraft: 3,
      quantityOwned: 1,
    });
  });

  it("recalculates when the draft from useDeckDraft changes", () => {
    mockedUseCollection.mockReturnValue({
      status: "ready",
      loaded: { origin: "server", collection: new Map([["001", 3]]), syncedAt: "2026-07-28T00:00:00.000Z" },
    } as CollectionState);
    mockedUseDeckDraft.mockReturnValue(deckDraftResult(new Map([["001", 1]])));

    const { result, rerender } = renderHook(() => useDeckValidation());
    expect(result.current.total).toBe(1);

    mockedUseDeckDraft.mockReturnValue(deckDraftResult(new Map([["001", 3]])));
    rerender();

    expect(result.current.total).toBe(3);
    expect(result.current.violations).not.toContainEqual(
      expect.objectContaining({ type: "exceeds_owned_quantity" }),
    );
  });
});
