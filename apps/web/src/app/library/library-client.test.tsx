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
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LibraryState } from "../../hooks/use-library.ts";
import { useLibrary } from "../../hooks/use-library.ts";
import type { LibraryCatalogPayload } from "../../lib/library/types.ts";
import { LibraryClient } from "./library-client.tsx";

vi.mock("../../hooks/use-library.ts", () => ({
  useLibrary: vi.fn(),
}));

const navigation = vi.hoisted(() => ({ query: "", replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.query),
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
  beforeEach(() => {
    navigation.query = "";
    navigation.replace.mockReset();
  });

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

  it("shows the search field only when a nonempty library is ready", () => {
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
    expect(screen.getByRole("searchbox", { name: "Buscar carta" })).toBeTruthy();
  });

  it("filters the grid by the q parameter", () => {
    navigation.query = "q=Card+003";
    mockState({
      status: "ready",
      loaded: {
        index: buildIndex(["001", "002", "003"]),
        collectionOrigin: "server",
        syncedAt: "2026-01-01T00:00:00.000Z",
      },
      reload: RELOAD,
    });

    render(<LibraryClient catalogResult={CATALOG_PAYLOAD} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("Card 003")).toBeTruthy();
  });

  it("shows the search-specific empty state for a term without matches", () => {
    navigation.query = "q=missing";
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
    expect(screen.getByText("Nenhuma carta encontrada para 'missing'.")).toBeTruthy();
  });

  it("replaces the URL without scrolling and preserves future filters", () => {
    navigation.query = "status=all";
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
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dragon" } });

    expect(navigation.replace).toHaveBeenCalledWith("/library?status=all&q=dragon", {
      scroll: false,
    });
  });

  it("filters by status and type before delivering the ordered sequence to the grid", () => {
    navigation.query = "status=todas&tipo=monstro&ordem=numero&direcao=desc";
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
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/library/003?status=todas&tipo=monstro&ordem=numero&direcao=desc",
      "/library/001?status=todas&tipo=monstro&ordem=numero&direcao=desc",
    ]);
  });

  it("renders blocked entries for the not-obtained status", () => {
    navigation.query = "status=nao-obtidas";
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
    expect(screen.getAllByText("???")).toHaveLength(2);
  });

  it("shows the filter-specific empty state when filters remove every card", () => {
    navigation.query = "status=nao-obtidas&tipo=monstro";
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
    expect(screen.getByText("Nenhuma carta corresponde aos filtros selecionados.")).toBeTruthy();
  });

  it("gives the active-search message precedence over the filter empty state", () => {
    navigation.query = "q=missing&status=todas";
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
    expect(screen.getByText("Nenhuma carta encontrada para 'missing'.")).toBeTruthy();
    expect(screen.queryByText("Nenhuma carta corresponde aos filtros selecionados.")).toBeNull();
  });

  it("clears F04 filters while preserving the search term", () => {
    navigation.query = "q=dragon&status=todas&ordem=atk";
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
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(navigation.replace).toHaveBeenCalledWith("/library?q=dragon", { scroll: false });
  });
});
