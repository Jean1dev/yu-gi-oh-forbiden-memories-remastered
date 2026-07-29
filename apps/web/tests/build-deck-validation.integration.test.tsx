// @vitest-environment jsdom
import type { Card } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BuildDeckClient } from "../src/app/build-deck/build-deck-client.tsx";
import type { UseActiveDeckPersistenceResult } from "../src/hooks/use-active-deck-persistence.ts";
import { useActiveDeckPersistence } from "../src/hooks/use-active-deck-persistence.ts";
import { useActiveDeckSync } from "../src/hooks/use-active-deck-sync.ts";
import type { CollectionState } from "../src/hooks/use-collection.ts";
import { useCollection } from "../src/hooks/use-collection.ts";
import { useDeckDraftStore } from "../src/stores/deck-draft-store.ts";

/**
 * Full render-tree integration for build-deck/F06: F04's collection panel,
 * F05's editor and store, and F06's `DeckValidationSummary`, wired together
 * exactly as `BuildDeckClient` composes them — same scope as F05's own
 * integration test (`build-deck-editing.integration.test.tsx`), which this
 * one builds on top of. Only `useCollection`, `useActiveDeckPersistence` and
 * `useActiveDeckSync` are mocked (build-deck/F07 superseded F05's
 * `useActiveDeck` as the initial-load source; see that spec's Seção 2).
 *
 * The "already inconsistent draft" scenario (spec build-deck/F06 §7) seeds
 * the mocked `useActiveDeckPersistence`'s `activeDeck` with a composition
 * `addCard` would never produce (bypassing its cap checks) —
 * `BuildDeckClient`'s mount effect (`initializeDraft`) then hydrates the real
 * Zustand store from it, so this reaches F06 exactly like a persisted deck
 * that got corrupted upstream would, without mocking `useDeckDraft` itself
 * (spec's suggested approach).
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

/** 13 distinct filler card numbers, at most 3 copies each, summing to 39 — one card short of 40. */
function fillerDeckOfThirtyNine(): Map<string, number> {
  const entries: [string, number][] = [];
  for (let i = 2; i <= 14; i += 1) {
    entries.push([String(i).padStart(3, "0"), 3]);
  }
  return new Map(entries);
}

beforeEach(() => {
  useDeckDraftStore.setState({ originalActiveDeck: new Map(), draft: new Map(), lastBlock: undefined });
  mockedUseActiveDeckSync.mockReturnValue(undefined);
});

function mockActiveDeck(activeDeck: Map<string, number>): void {
  mockedUseActiveDeckPersistence.mockReturnValue({
    state: { status: "ready", activeDeck, conflictDetected: false },
    saveStatus: { kind: "idle" },
    save: vi.fn(),
  } as UseActiveDeckPersistenceResult);
}

function selectDragon(): void {
  fireEvent.click(screen.getByRole("button", { name: "Blue-eyes White Dragon" }));
}

function clickAdd(): void {
  fireEvent.click(screen.getByRole("button", { name: /Adicionar Blue-eyes White Dragon ao deck/ }));
}

describe("build-deck/F06 validation flow", () => {
  it("reaching exactly forty cards with no other violation clears the violation list and shows 40/40", () => {
    const fillers = fillerDeckOfThirtyNine();
    mockActiveDeck(fillers);
    mockedUseCollection.mockReturnValue({
      status: "ready",
      loaded: {
        origin: "server",
        collection: new Map([["001", 2], ...fillers]),
        syncedAt: "2026-07-28T00:00:00.000Z",
      },
    } as CollectionState);

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    expect(screen.getByText("39/40")).toBeTruthy();
    expect(screen.getByText("Faltam 1 cartas para 40")).toBeTruthy();

    selectDragon();
    clickAdd();

    expect(screen.getByText("40/40")).toBeTruthy();
    expect(screen.queryByText(/Faltam/)).toBeNull();
    expect(screen.queryByText(/Excedem/)).toBeNull();
    expect(screen.queryByText(/: \d+ cópias \(máx\. 3\)/)).toBeNull();
    expect(screen.queryByText(/além do que possui/)).toBeNull();
  });

  it("blocking the fourth copy in F05 never lets a copy_limit_exceeded violation reach F06", () => {
    mockActiveDeck(new Map());
    mockedUseCollection.mockReturnValue({
      status: "ready",
      loaded: { origin: "server", collection: new Map([["001", 3]]), syncedAt: "2026-07-28T00:00:00.000Z" },
    } as CollectionState);

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    selectDragon();
    clickAdd();
    clickAdd();
    clickAdd();
    clickAdd();

    expect(screen.getByText("3/40")).toBeTruthy();
    expect(screen.queryByText(/: \d+ cópias \(máx\. 3\)/)).toBeNull();
  });

  it("shows the specific messages for an active deck already inconsistent with the copy cap and ownership", () => {
    mockActiveDeck(new Map([["001", 5]]));
    mockedUseCollection.mockReturnValue({
      status: "ready",
      loaded: { origin: "server", collection: new Map([["001", 2]]), syncedAt: "2026-07-28T00:00:00.000Z" },
    } as CollectionState);

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON] }} />);

    expect(screen.getByText("5/40")).toBeTruthy();
    expect(screen.getByText("Faltam 35 cartas para 40")).toBeTruthy();
    expect(screen.getByText("Blue-eyes White Dragon: 5 cópias (máx. 3)")).toBeTruthy();
    expect(screen.getByText("Blue-eyes White Dragon: além do que possui (2)")).toBeTruthy();
  });
});
