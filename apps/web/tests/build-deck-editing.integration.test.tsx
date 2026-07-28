// @vitest-environment jsdom
import type { Card } from "@yugioh/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BuildDeckClient } from "../src/app/build-deck/build-deck-client.tsx";
import type { ActiveDeckState } from "../src/hooks/use-active-deck.ts";
import { useActiveDeck } from "../src/hooks/use-active-deck.ts";
import type { CollectionState } from "../src/hooks/use-collection.ts";
import { useCollection } from "../src/hooks/use-collection.ts";
import { useDeckDraftStore } from "../src/stores/deck-draft-store.ts";

/**
 * Full render-tree integration for build-deck/F05: F04's collection panel,
 * F05's editor and store, and the leave-without-saving guard, all wired
 * together exactly as `BuildDeckClient` composes them. Only the two hooks
 * that actually touch Supabase (`useCollection`, `useActiveDeck`) are mocked
 * — everything else (the store, `useDeckDraft`, `useCollectionPanel`,
 * `useUnsavedChangesWarning`, every component) runs for real, matching the
 * scope of the F04 integration test this feature builds on top of.
 */
vi.mock("../src/hooks/use-collection.ts", () => ({
  useCollection: vi.fn(),
}));
vi.mock("../src/hooks/use-active-deck.ts", () => ({
  useActiveDeck: vi.fn(),
}));

const mockedUseCollection = vi.mocked(useCollection);
const mockedUseActiveDeck = vi.mocked(useActiveDeck);

const DRAGON: Card = {
  id: 1,
  numero: "001",
  nome: "Blue-eyes White Dragon",
  img: null,
  classe: "Dragon",
  atk: 3000,
  def: 2500,
  guardiao1: null,
  guardiao2: null,
  password: null,
  estrelas: null,
  tipo: "monstro",
};

beforeEach(() => {
  useDeckDraftStore.setState({ originalActiveDeck: new Map(), draft: new Map(), lastBlock: undefined });

  mockedUseCollection.mockReturnValue({
    status: "ready",
    loaded: { origin: "server", collection: new Map([["001", 2]]), syncedAt: "2026-07-28T00:00:00.000Z" },
  } as CollectionState);

  mockedUseActiveDeck.mockReturnValue({ status: "ready", activeDeck: new Map() } as ActiveDeckState);
});

function selectDragon(): void {
  fireEvent.click(screen.getByRole("button", { name: "Blue-eyes White Dragon" }));
}

function clickAdd(): void {
  fireEvent.click(screen.getByRole("button", { name: /Adicionar Blue-eyes White Dragon ao deck/ }));
}

describe("build-deck/F05 editing flow", () => {
  it("moves a card from the collection into the draft and reflects the total immediately", () => {
    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    selectDragon();
    clickAdd();

    expect(screen.getByText("Total no deck: 1")).toBeTruthy();
    expect(screen.getByText("possui 2 · no deck 1")).toBeTruthy();
  });

  it("blocks the third copy of a card the player owns only twice, with the specific message", () => {
    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    selectDragon();
    clickAdd();
    clickAdd();
    clickAdd();

    expect(screen.getByText("Total no deck: 2")).toBeTruthy();
    expect(screen.getByText("Você possui apenas 2 cópia(s) desta carta.")).toBeTruthy();
  });

  it("removing a card from the draft returns it to the collection and updates the total", () => {
    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    selectDragon();
    clickAdd();
    expect(screen.getByText("Total no deck: 1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remover uma cópia de Blue-eyes White Dragon" }));

    expect(screen.getByText("Total no deck: 0")).toBeTruthy();
    expect(screen.getByText("possui 2 · no deck 0")).toBeTruthy();
  });

  it("asks for confirmation before leaving with an unsaved draft, and preserves the draft on cancel", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const historyBackSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    selectDragon();
    clickAdd();

    fireEvent.click(screen.getByRole("button", { name: "◀ Voltar" }));

    expect(confirmSpy).toHaveBeenCalledWith("Você tem alterações não salvas. Sair sem salvar?");
    expect(historyBackSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Total no deck: 1")).toBeTruthy();

    confirmSpy.mockRestore();
    historyBackSpy.mockRestore();
  });

  it("discards the draft and navigates back once the player confirms leaving", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const historyBackSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    selectDragon();
    clickAdd();

    fireEvent.click(screen.getByRole("button", { name: "◀ Voltar" }));

    expect(confirmSpy).toHaveBeenCalledWith("Você tem alterações não salvas. Sair sem salvar?");
    await waitFor(() => {
      expect(historyBackSpy).toHaveBeenCalled();
    });
    expect(useDeckDraftStore.getState().draft.size).toBe(0);

    confirmSpy.mockRestore();
    historyBackSpy.mockRestore();
  });
});
