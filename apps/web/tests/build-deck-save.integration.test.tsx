// @vitest-environment jsdom
import type { Card } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BuildDeckClient } from "../src/app/build-deck/build-deck-client.tsx";
import type {
  SaveActiveDeckStatus,
  UseActiveDeckPersistenceResult,
} from "../src/hooks/use-active-deck-persistence.ts";
import { useActiveDeckPersistence } from "../src/hooks/use-active-deck-persistence.ts";
import { useActiveDeckSync } from "../src/hooks/use-active-deck-sync.ts";
import type { CollectionState } from "../src/hooks/use-collection.ts";
import { useCollection } from "../src/hooks/use-collection.ts";
import { useDeckDraftStore } from "../src/stores/deck-draft-store.ts";

/**
 * Full render-tree integration for build-deck/F07's UI wiring: the "Salvar
 * deck" button and its status/conflict indicator, exactly as `BuildDeckClient`
 * composes them — same scope as F05/F06's own integration tests, mocking
 * only the hooks that actually touch Supabase/IndexedDB
 * (`useCollection`, `useActiveDeckPersistence`, `useActiveDeckSync`).
 *
 * Each `it` renders one static branch of the save/conflict/sync state space
 * instead of one continuous online→offline→reconnect scenario: the real save
 * orchestration (network failure → offline queue → resync) is already
 * covered end-to-end by the unit/property tests in
 * `src/lib/active-deck/*.test.ts` and by the real-Supabase RPC suite in
 * `active-deck-save.integration.test.ts`; this file only verifies that
 * `BuildDeckClient`/`SaveDeckIndicator` render the right thing for each
 * outcome `useActiveDeckPersistence`/`useActiveDeckSync` can report.
 */
vi.mock("../src/hooks/use-collection.ts", () => ({
  useCollection: vi.fn(),
}));
vi.mock("../src/hooks/use-active-deck-persistence.ts", () => ({
  useActiveDeckPersistence: vi.fn(),
}));
vi.mock("../src/hooks/use-active-deck-sync.ts", () => ({
  useActiveDeckSync: vi.fn(),
}));

const mockedUseCollection = vi.mocked(useCollection);
const mockedUseActiveDeckPersistence = vi.mocked(useActiveDeckPersistence);
const mockedUseActiveDeckSync = vi.mocked(useActiveDeckSync);

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

/** 13 distinct card numbers at 3 copies plus one at 1 copy — sums to exactly 40. */
function fullValidDeck(): Map<string, number> {
  const entries: [string, number][] = [];
  for (let i = 1; i <= 13; i += 1) {
    entries.push([String(i).padStart(3, "0"), 3]);
  }
  entries.push(["014", 1]);
  return new Map(entries);
}

function mockActiveDeckPersistence(saveStatus: SaveActiveDeckStatus, conflictDetected = false): {
  save: ReturnType<typeof vi.fn>;
} {
  const save = vi.fn();
  mockedUseActiveDeckPersistence.mockReturnValue({
    state: { status: "ready", activeDeck: fullValidDeck(), conflictDetected },
    saveStatus,
    save,
  } as UseActiveDeckPersistenceResult);
  return { save };
}

function mockOwnedCollection(entries: Map<string, number>): void {
  mockedUseCollection.mockReturnValue({
    status: "ready",
    loaded: { origin: "server", collection: entries, syncedAt: "2026-07-29T00:00:00.000Z" },
  } as CollectionState);
}

beforeEach(() => {
  useDeckDraftStore.setState({ originalActiveDeck: new Map(), draft: new Map(), lastBlock: undefined });
  mockedUseActiveDeckSync.mockReturnValue(undefined);
});

describe("build-deck/F07 save indicator flow", () => {
  it("disables the save button while the draft has not reached forty valid cards", () => {
    mockActiveDeckPersistence({ kind: "idle" });
    mockOwnedCollection(new Map([["001", 2]]));
    useDeckDraftStore.setState({ draft: new Map([["001", 1]]), originalActiveDeck: new Map(), lastBlock: undefined });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    expect((screen.getByRole("button", { name: "Salvar deck" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables the save button once the draft is exactly forty valid cards, and calls save with the draft and owned collection on click", () => {
    const validDeck = fullValidDeck();
    const { save } = mockActiveDeckPersistence({ kind: "idle" });
    mockOwnedCollection(validDeck);
    useDeckDraftStore.setState({ draft: validDeck, originalActiveDeck: validDeck, lastBlock: undefined });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    const button = screen.getByRole("button", { name: "Salvar deck" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    fireEvent.click(button);

    expect(save).toHaveBeenCalledWith(validDeck, validDeck);
  });

  it("shows 'Deck salvo.' once the save resolves as saved", () => {
    const validDeck = fullValidDeck();
    mockActiveDeckPersistence({ kind: "done", result: { status: "saved", updatedAt: "2026-07-29T12:00:00.000Z" } });
    mockOwnedCollection(validDeck);
    useDeckDraftStore.setState({ draft: validDeck, originalActiveDeck: validDeck, lastBlock: undefined });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    expect(screen.getByText("Deck salvo.")).toBeTruthy();
  });

  it("shows the offline message when the save is queued instead of confirmed", () => {
    const validDeck = fullValidDeck();
    mockActiveDeckPersistence({ kind: "done", result: { status: "saved_offline" } });
    mockOwnedCollection(validDeck);
    useDeckDraftStore.setState({ draft: validDeck, originalActiveDeck: validDeck, lastBlock: undefined });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    expect(screen.getByText("Salvo offline — sincronizando quando a conexão voltar.")).toBeTruthy();
  });

  it("shows the invalid-deck refusal message when the RPC refuses even though the button was clickable", () => {
    const validDeck = fullValidDeck();
    mockActiveDeckPersistence({ kind: "done", result: { status: "refused", reason: "invalid_deck" } });
    mockOwnedCollection(validDeck);
    useDeckDraftStore.setState({ draft: validDeck, originalActiveDeck: validDeck, lastBlock: undefined });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    expect(
      screen.getByText("Deck inválido: exatamente 40 cartas, máx. 3 cópias, apenas cartas possuídas."),
    ).toBeTruthy();
  });

  it("shows the conflict notice when useActiveDeckPersistence reports a version conflict on load", () => {
    const validDeck = fullValidDeck();
    mockActiveDeckPersistence({ kind: "idle" }, true);
    mockOwnedCollection(validDeck);
    useDeckDraftStore.setState({ draft: validDeck, originalActiveDeck: validDeck, lastBlock: undefined });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    expect(
      screen.getByText("Seu deck foi atualizado em outro dispositivo; a versão mais recente foi mantida."),
    ).toBeTruthy();
  });

  it("shows 'Deck sincronizado.' once a background sync resolves a previously queued offline save", () => {
    const validDeck = fullValidDeck();
    mockActiveDeckPersistence({ kind: "idle" });
    mockOwnedCollection(validDeck);
    mockedUseActiveDeckSync.mockReturnValue({ status: "synced", updatedAt: "2026-07-29T12:05:00.000Z" });
    useDeckDraftStore.setState({ draft: validDeck, originalActiveDeck: validDeck, lastBlock: undefined });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    expect(screen.getByText("Deck sincronizado.")).toBeTruthy();
  });
});
