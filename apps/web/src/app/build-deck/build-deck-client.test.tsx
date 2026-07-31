// @vitest-environment jsdom
import { DomainError } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CollectionPanelActions, CollectionPanelState } from "../../hooks/use-collection-panel.ts";
import { useCollectionPanel } from "../../hooks/use-collection-panel.ts";
import type { CollectionState } from "../../hooks/use-collection.ts";
import { useCollection } from "../../hooks/use-collection.ts";
import type {
  ActiveDeckPersistenceState,
  UseActiveDeckPersistenceResult,
} from "../../hooks/use-active-deck-persistence.ts";
import { useActiveDeckPersistence } from "../../hooks/use-active-deck-persistence.ts";
import { useActiveDeckSync } from "../../hooks/use-active-deck-sync.ts";
import type { UseDeckDraftResult } from "../../hooks/use-deck-draft.ts";
import { useDeckDraft } from "../../hooks/use-deck-draft.ts";
import { useUnsavedChangesWarning } from "../../hooks/use-unsaved-changes-warning.ts";
import { useVictoryRewardSync } from "../../hooks/use-victory-reward-sync.ts";
import { BuildDeckClient } from "./build-deck-client.tsx";

vi.mock("../../hooks/use-collection-panel.ts", () => ({
  useCollectionPanel: vi.fn(),
}));
vi.mock("../../hooks/use-collection.ts", () => ({
  useCollection: vi.fn(),
}));
vi.mock("../../hooks/use-active-deck-persistence.ts", () => ({
  useActiveDeckPersistence: vi.fn(),
}));
vi.mock("../../hooks/use-active-deck-sync.ts", () => ({
  useActiveDeckSync: vi.fn(),
}));
vi.mock("../../hooks/use-deck-draft.ts", () => ({
  useDeckDraft: vi.fn(),
}));
vi.mock("../../hooks/use-unsaved-changes-warning.ts", () => ({
  useUnsavedChangesWarning: vi.fn(),
}));
vi.mock("../../hooks/use-victory-reward-sync.ts", () => ({
  useVictoryRewardSync: vi.fn(),
}));

const mockedPanelHook = vi.mocked(useCollectionPanel);
const mockedCollectionHook = vi.mocked(useCollection);
const mockedActiveDeckHook = vi.mocked(useActiveDeckPersistence);
const mockedActiveDeckSyncHook = vi.mocked(useActiveDeckSync);
const mockedDeckDraftHook = vi.mocked(useDeckDraft);
const mockedUnsavedChangesHook = vi.mocked(useUnsavedChangesWarning);
const mockedVictoryRewardSyncHook = vi.mocked(useVictoryRewardSync);

const NOOP_ACTIONS: CollectionPanelActions = { setTerm: vi.fn(), select: vi.fn() };

const DEFAULT_DRAFT_RESULT: UseDeckDraftResult = {
  draft: new Map(),
  total: 0,
  lastBlock: undefined,
  activeDeckLookup: () => 0,
  hasUnsavedChanges: false,
  canAddCard: true,
  addCard: vi.fn(),
  removeCard: vi.fn(),
};

function mockPanel(state: CollectionPanelState): void {
  mockedPanelHook.mockReturnValue({ ...state, ...NOOP_ACTIONS });
}

function mockActiveDeck(state: ActiveDeckPersistenceState): void {
  const result: UseActiveDeckPersistenceResult = { state, saveStatus: { kind: "idle" }, save: vi.fn() };
  mockedActiveDeckHook.mockReturnValue(result);
}

function mockDeckDraft(overrides: Partial<UseDeckDraftResult> = {}): void {
  mockedDeckDraftHook.mockReturnValue({ ...DEFAULT_DRAFT_RESULT, ...overrides });
}

const READY_COLLECTION_STATE: CollectionState = {
  status: "ready",
  loaded: { origin: "server", collection: new Map(), syncedAt: "2026-07-28T00:00:00.000Z" },
};

/** The steady state every pre-existing (F04) branch test starts from: an active deck already resolved. */
function mockReadyActiveDeckAndDraft(): void {
  mockActiveDeck({ status: "ready", activeDeck: new Map(), conflictDetected: false });
  mockDeckDraft();
  mockedCollectionHook.mockReturnValue(READY_COLLECTION_STATE);
  mockedActiveDeckSyncHook.mockReturnValue(undefined);
  mockedUnsavedChangesHook.mockReturnValue({ confirmInternalNavigation: vi.fn(() => true) });
}

describe("BuildDeckClient", () => {
  it("mounts victory reward sync with the resolved catalog", () => {
    mockReadyActiveDeckAndDraft();
    mockPanel({ status: "loading" });
    const card = { numero: "001" } as never;
    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [card] }} />);
    const catalog = mockedVictoryRewardSyncHook.mock.calls.at(-1)?.[0];
    expect(catalog?.("001")).toBe(card);
  });

  it("disables victory reward sync when the catalog failed to load", () => {
    mockReadyActiveDeckAndDraft();
    mockPanel({ status: "loading" });
    render(<BuildDeckClient catalogResult={{ status: "error" }} />);
    expect(mockedVictoryRewardSyncHook).toHaveBeenLastCalledWith(undefined);
  });

  it("shows the skeleton while the load has not resolved", () => {
    mockReadyActiveDeckAndDraft();
    mockPanel({ status: "loading" });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(screen.getByTestId("collection-panel-skeleton")).toBeTruthy();
  });

  it("shows the collection failure message and no items", () => {
    mockReadyActiveDeckAndDraft();
    mockPanel({ status: "error", error: new DomainError("boom", "collection_unavailable") });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(screen.getByText("Não foi possível carregar sua coleção. Tente novamente.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows the session-missing message when there is no authenticated player", () => {
    mockReadyActiveDeckAndDraft();
    mockPanel({ status: "error", error: new DomainError("no session", "session_missing") });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(screen.getByText("Faça login para ver sua coleção.")).toBeTruthy();
  });

  it("shows the empty state when the player owns no card", () => {
    mockReadyActiveDeckAndDraft();
    mockPanel({
      status: "ready",
      origin: "server",
      isEmpty: true,
      items: [],
      term: "",
      selectedCardNumber: undefined,
    });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(
      screen.getByText("Você ainda não possui cartas. Vença duelos ou use senhas para começar sua coleção."),
    ).toBeTruthy();
  });

  it("shows the cache notice when the collection came from local storage", () => {
    mockReadyActiveDeckAndDraft();
    mockPanel({
      status: "ready",
      origin: "cache",
      isEmpty: false,
      items: [],
      term: "",
      selectedCardNumber: undefined,
    });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(
      screen.getByText("Coleção carregada do cache; algumas cartas podem estar desatualizadas."),
    ).toBeTruthy();
  });

  it("shows the catalog-unavailable failure when the server catalog failed to load", () => {
    mockReadyActiveDeckAndDraft();
    mockPanel({ status: "loading" });

    render(<BuildDeckClient catalogResult={{ status: "error" }} />);

    expect(
      screen.getByText("Não foi possível carregar o catálogo de cartas. Tente novamente."),
    ).toBeTruthy();
  });

  it("shows the preparing-initial-deck message while the active deck row has not been created yet", () => {
    mockActiveDeck({ status: "pending" });
    mockDeckDraft();
    mockedCollectionHook.mockReturnValue(READY_COLLECTION_STATE);
    mockedActiveDeckSyncHook.mockReturnValue(undefined);
    mockedUnsavedChangesHook.mockReturnValue({ confirmInternalNavigation: vi.fn(() => true) });
    mockPanel({ status: "loading" });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(screen.getByText("Preparando seu deck inicial…")).toBeTruthy();
  });

  it("shows the block message reported by useDeckDraft", () => {
    mockReadyActiveDeckAndDraft();
    mockDeckDraft({ lastBlock: new DomainError("boom", "card_not_owned", { cardNumber: "001" }) });
    mockPanel({
      status: "ready",
      origin: "server",
      isEmpty: false,
      items: [],
      term: "",
      selectedCardNumber: undefined,
    });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(screen.getByText("Carta não está na sua coleção.")).toBeTruthy();
  });
});
