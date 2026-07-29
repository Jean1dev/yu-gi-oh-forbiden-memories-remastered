// @vitest-environment jsdom
import { buildLibraryIndex } from "@yugioh/rules";
import type {
  Card,
  CardArtLookup,
  CardNumber,
  LibraryCatalogListing,
  LibraryIndex,
} from "@yugioh/shared";
import { DomainError } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LibraryState } from "../../hooks/use-library.ts";
import { useLibrary } from "../../hooks/use-library.ts";
import type { LibraryCatalogPayload } from "../../lib/library/types.ts";
import { LibraryClient } from "./library-client.tsx";

vi.mock("../../hooks/use-library.ts", () => ({
  useLibrary: vi.fn(),
}));

const mockedUseLibrary = vi.mocked(useLibrary);

function mockState(state: LibraryState): void {
  mockedUseLibrary.mockReturnValue(state);
}

function card(numero: CardNumber): Card {
  return {
    id: Number(numero),
    numero,
    nome: `Card ${numero}`,
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

function fakeCatalog(cards: readonly Card[]): LibraryCatalogListing {
  return { listAll: () => cards, totalCount: () => cards.length };
}

const artLookup: CardArtLookup = () => ({ kind: "placeholder" });

function buildIndex(obtainedNumbers: readonly CardNumber[]): LibraryIndex {
  return buildLibraryIndex({
    catalog: fakeCatalog([card("001"), card("002"), card("003")]),
    obtainedCardNumbers: new Set(obtainedNumbers),
    artLookup,
  });
}

const RELOAD = vi.fn();

/**
 * `useLibrary` is mocked in this file, so the payload's content never reaches
 * the assertions — it only has to satisfy the prop `page.tsx` passes. What the
 * component does with a real one is covered by `catalog-payload.ts`'s own
 * round-trip and by `library.integration.test.ts` against the 722-card dataset.
 */
const CATALOG_PAYLOAD: LibraryCatalogPayload = {
  status: "ok",
  cards: [card("001"), card("002"), card("003")],
  arts: {},
};

describe("LibraryClient", () => {
  it("shows the skeleton while the load has not resolved", () => {
    mockState({ status: "loading" });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);

    expect(screen.getByTestId("library-grid-skeleton")).toBeTruthy();
  });

  it("shows the catalog-failure message and does not mount the grid", () => {
    mockState({
      status: "error",
      error: new DomainError("boom", "catalog_unavailable"),
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);

    expect(screen.getByText("Não foi possível carregar as cartas. Tente novamente.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows the collection-failure message and no card as obtained", () => {
    mockState({
      status: "error",
      error: new DomainError("boom", "collection_unavailable"),
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);

    expect(
      screen.getByText("Não foi possível carregar sua coleção. Tente novamente."),
    ).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows the session-missing message when there is no authenticated player", () => {
    mockState({
      status: "error",
      error: new DomainError("no session", "session_missing"),
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);

    expect(screen.getByText("Faça login para ver sua coleção.")).toBeTruthy();
  });

  it("shows the empty state when the player owns no card", () => {
    mockState({
      status: "ready",
      loaded: {
        index: buildIndex([]),
        collectionOrigin: "server",
        syncedAt: "2026-01-01T00:00:00.000Z",
      },
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);

    expect(
      screen.getByText(
        "Você ainda não obteve nenhuma carta. Vença duelos ou use senhas para começar sua coleção.",
      ),
    ).toBeTruthy();
  });

  it("keeps the indicator visible in the empty state", () => {
    mockState({
      status: "ready",
      loaded: {
        index: buildIndex([]),
        collectionOrigin: "server",
        syncedAt: "2026-01-01T00:00:00.000Z",
      },
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);

    const statuses = screen.getAllByRole("status").map((element) => element.textContent);
    expect(statuses.some((text) => text?.includes("0 de 3 obtidas"))).toBe(true);
  });

  it("shows the cache notice when the collection came from local storage", () => {
    mockState({
      status: "ready",
      loaded: {
        index: buildIndex(["001"]),
        collectionOrigin: "cache",
        syncedAt: "2026-01-01T00:00:00.000Z",
      },
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);

    expect(screen.getByText(/Coleção carregada do cache/)).toBeTruthy();
  });

  it("does not show the cache notice when the collection came from the server", () => {
    mockState({
      status: "ready",
      loaded: {
        index: buildIndex(["001"]),
        collectionOrigin: "server",
        syncedAt: "2026-01-01T00:00:00.000Z",
      },
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);

    expect(screen.queryByText(/Coleção carregada do cache/)).toBeNull();
  });

  it("shows only the obtained cards by default", () => {
    mockState({
      status: "ready",
      loaded: {
        index: buildIndex(["001", "003"]),
        collectionOrigin: "server",
        syncedAt: "2026-01-01T00:00:00.000Z",
      },
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("triggers the reload when the reload button is activated", () => {
    mockState({
      status: "error",
      error: new DomainError("boom", "collection_unavailable"),
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(RELOAD).toHaveBeenCalled();
  });
});
