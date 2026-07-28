// @vitest-environment jsdom
import { DomainError } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CollectionPanelActions, CollectionPanelState } from "../../hooks/use-collection-panel.ts";
import { useCollectionPanel } from "../../hooks/use-collection-panel.ts";
import { BuildDeckClient } from "./build-deck-client.tsx";

vi.mock("../../hooks/use-collection-panel.ts", () => ({
  useCollectionPanel: vi.fn(),
}));

const mockedHook = vi.mocked(useCollectionPanel);

const NOOP_ACTIONS: CollectionPanelActions = { setTerm: vi.fn(), select: vi.fn() };

function mockPanel(state: CollectionPanelState): void {
  mockedHook.mockReturnValue({ ...state, ...NOOP_ACTIONS });
}

describe("BuildDeckClient", () => {
  it("shows the skeleton while the load has not resolved", () => {
    mockPanel({ status: "loading" });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(screen.getByTestId("collection-panel-skeleton")).toBeTruthy();
  });

  it("shows the collection failure message and no items", () => {
    mockPanel({ status: "error", error: new DomainError("boom", "collection_unavailable") });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(screen.getByText("Não foi possível carregar sua coleção. Tente novamente.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows the session-missing message when there is no authenticated player", () => {
    mockPanel({ status: "error", error: new DomainError("no session", "session_missing") });

    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [] }} />);

    expect(screen.getByText("Faça login para ver sua coleção.")).toBeTruthy();
  });

  it("shows the empty state when the player owns no card", () => {
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
    mockPanel({ status: "loading" });

    render(<BuildDeckClient catalogResult={{ status: "error" }} />);

    expect(
      screen.getByText("Não foi possível carregar o catálogo de cartas. Tente novamente."),
    ).toBeTruthy();
  });
});
