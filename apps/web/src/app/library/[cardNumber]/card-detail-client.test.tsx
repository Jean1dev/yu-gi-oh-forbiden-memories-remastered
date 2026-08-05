// @vitest-environment jsdom
import {
  DomainError,
  type Card,
  type CardNumber,
  type LibraryEntry,
  type LoadedLibrary,
} from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LibraryState } from "../../../hooks/use-library.ts";
import type { LibraryCatalogPayload } from "../../../lib/library/types.ts";
import { CardDetailClient } from "./card-detail-client.tsx";

vi.mock("../../../hooks/use-library.ts", () => ({
  useLibrary: vi.fn(),
}));

import { useLibrary } from "../../../hooks/use-library.ts";

const CARD: Card = {
  id: 1,
  numero: "001",
  nome: "Blue-Eyes White Dragon",
  img: null,
  classe: "Dragon",
  atk: 3000,
  def: 2500,
  guardiao1: "Sun",
  guardiao2: "Mars",
  password: "89 63 14 30",
  estrelas: 999999,
  tipo: "monstro",
};

const OBTAINED_ENTRY: LibraryEntry = {
  obtained: true,
  cardNumber: "001",
  card: CARD,
  art: { kind: "placeholder" },
};
const BLOCKED_ENTRY: LibraryEntry = {
  obtained: false,
  cardNumber: "002",
  art: { kind: "silhouette" },
};
const CATALOG_RESULT: LibraryCatalogPayload = {
  status: "ok",
  cards: [CARD],
  arts: { "001": { kind: "placeholder" } },
  cropArts: {},
};
const LOADED: LoadedLibrary = {
  index: {
    entries: [OBTAINED_ENTRY, BLOCKED_ENTRY],
    byCardNumber: new Map<CardNumber, LibraryEntry>([
      ["001", OBTAINED_ENTRY],
      ["002", BLOCKED_ENTRY],
    ]),
    total: 2,
    obtained: 1,
    obtainedOutsideCatalog: [],
  },
  collectionOrigin: "server",
  syncedAt: "2026-07-29T00:00:00.000Z",
};

function renderDetail(cardNumber = "001") {
  return render(
    <CardDetailClient
      cardNumber={cardNumber}
      returnDestination="/library?q=dragon"
      catalogResult={CATALOG_RESULT}
    />,
  );
}

describe("CardDetailClient", () => {
  beforeEach(() => {
    vi.mocked(useLibrary).mockReset();
  });

  it("shows a loading skeleton while the Library loads", () => {
    vi.mocked(useLibrary).mockReturnValue({ status: "loading" });

    renderDetail();

    expect(screen.getByLabelText("Carregando detalhe da carta").getAttribute("aria-busy")).toBe(
      "true",
    );
  });

  it.each([
    ["catalog_unavailable", "Não foi possível carregar as cartas. Tente novamente."],
    ["collection_unavailable", "Não foi possível carregar sua coleção. Tente novamente."],
    ["session_missing", "Faça login para ver sua coleção."],
  ])("shows the %s failure without a partial detail", (code, message) => {
    const state: LibraryState = {
      status: "error",
      error: new DomainError("failed", code),
      reload: vi.fn(),
    };
    vi.mocked(useLibrary).mockReturnValue(state);

    renderDetail();

    expect(screen.getByRole("alert").textContent).toContain(message);
    expect(screen.queryByText(CARD.nome)).toBeNull();
  });

  it("finds and renders a complete obtained entry by route number", () => {
    vi.mocked(useLibrary).mockReturnValue({ status: "ready", loaded: LOADED, reload: vi.fn() });

    renderDetail("001");

    expect(screen.getByRole("heading", { name: CARD.nome })).toBeTruthy();
    expect(screen.getByText("3000")).toBeTruthy();
  });

  it("renders the redacted state for a not-obtained entry", () => {
    vi.mocked(useLibrary).mockReturnValue({ status: "ready", loaded: LOADED, reload: vi.fn() });

    renderDetail("002");

    expect(screen.getByText("Carta ainda não obtida")).toBeTruthy();
    expect(screen.queryByText(CARD.nome)).toBeNull();
  });

  it.each(["invalid", "999"])("renders not found for invalid or unknown route number %s", (number) => {
    vi.mocked(useLibrary).mockReturnValue({ status: "ready", loaded: LOADED, reload: vi.fn() });

    renderDetail(number);

    expect(screen.getByRole("heading", { name: "Carta não encontrada." })).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/library?q=dragon");
  });
});
