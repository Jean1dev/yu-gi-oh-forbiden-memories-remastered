// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { Card } from "@yugioh/shared";
import { DomainError } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { unavailableActiveDeck } from "../lib/build-deck/unavailable-active-deck.ts";
import { useCollectionPanel } from "./use-collection-panel.ts";
import { useCollection, type CollectionState } from "./use-collection.ts";

vi.mock("./use-collection.ts", () => ({
  useCollection: vi.fn(),
}));

const mockedUseCollection = vi.mocked(useCollection);

function card(numero: string, nome: string): Card {
  return {
    id: 1,
    numero,
    nome,
    img: null,
    classe: "Dragon",
    atk: 100,
    def: 100,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

describe("useCollectionPanel", () => {
  it("exposes empty items while the collection is loading", () => {
    mockedUseCollection.mockReturnValue({ status: "loading" });

    const { result } = renderHook(() => useCollectionPanel([], unavailableActiveDeck()));

    expect(result.current.status).toBe("loading");
  });

  it("exposes the error returned by useCollection without producing items", () => {
    const error = new DomainError("boom", "collection_unavailable");
    mockedUseCollection.mockReturnValue({ status: "error", error } as CollectionState);

    const { result } = renderHook(() => useCollectionPanel([], unavailableActiveDeck()));

    expect(result.current.status).toBe("error");
    expect(result.current.status === "error" && result.current.error.code).toBe(
      "collection_unavailable",
    );
  });

  it("applies the search over the items composed with the deck quantity", () => {
    const dragon = card("001", "Blue-eyes White Dragon");
    const elf = card("002", "Mystical Elf");
    mockedUseCollection.mockReturnValue({
      status: "ready",
      loaded: {
        origin: "server",
        collection: new Map([
          ["001", 1],
          ["002", 1],
        ]),
        syncedAt: "2026-07-27T12:00:00.000Z",
      },
    } as CollectionState);

    const { result } = renderHook(() => useCollectionPanel([dragon, elf], unavailableActiveDeck()));

    act(() => {
      if (result.current.status === "ready") {
        result.current.setTerm("elf");
      }
    });

    expect(result.current.status === "ready" && result.current.items.map((i) => i.card.numero)).toEqual([
      "002",
    ]);
  });

  it("uses zero for deckQuantity when no real active-deck lookup is provided", () => {
    const dragon = card("001", "Blue-eyes White Dragon");
    mockedUseCollection.mockReturnValue({
      status: "ready",
      loaded: { origin: "server", collection: new Map([["001", 2]]), syncedAt: "2026-07-27T12:00:00.000Z" },
    } as CollectionState);

    const { result } = renderHook(() => useCollectionPanel([dragon], unavailableActiveDeck()));

    expect(result.current.status === "ready" && result.current.items[0]?.deckQuantity).toBe(0);
  });

  it("updates selectedCardNumber when select is called", () => {
    const dragon = card("001", "Blue-eyes White Dragon");
    mockedUseCollection.mockReturnValue({
      status: "ready",
      loaded: { origin: "server", collection: new Map([["001", 1]]), syncedAt: "2026-07-27T12:00:00.000Z" },
    } as CollectionState);

    const { result } = renderHook(() => useCollectionPanel([dragon], unavailableActiveDeck()));

    act(() => {
      result.current.select("001");
    });

    expect(result.current.status === "ready" && result.current.selectedCardNumber).toBe("001");
  });
});
