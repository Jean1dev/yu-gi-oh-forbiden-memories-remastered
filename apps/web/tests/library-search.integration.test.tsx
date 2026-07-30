// @vitest-environment jsdom
import {
  buildLibraryIndex,
  filterLibrarySearch,
  normalizeLibrarySearchTerm,
  prepareLibrarySearch,
} from "@yugioh/rules";
import type { Card, CardNumber, LibraryCatalogListing } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CollectionGrid } from "../src/components/library/collection-grid.tsx";
import { LibrarySearchField } from "../src/components/library/search-field.tsx";
import { LibrarySearchNoResults } from "../src/components/library/search-no-results.tsx";
import {
  applySearchToUrl,
  readSearchFromUrl,
  removeSearchFromUrl,
} from "../src/lib/library/search-url.ts";

function card(cardNumber: CardNumber, name: string): Card {
  return {
    id: Number(cardNumber),
    numero: cardNumber,
    nome: name,
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

const cards = [
  card("001", "Blue-Eyes White Dragon"),
  card("002", "Dragão Negro"),
  card("003", "Dark Magician"),
];
const catalog: LibraryCatalogListing = {
  listAll: () => cards,
  totalCount: () => cards.length,
};
const index = buildLibraryIndex({
  catalog,
  obtainedCardNumbers: new Set<CardNumber>(["001", "002", "003"]),
  artLookup: () => ({ kind: "placeholder" }),
});
const searchIndex = prepareLibrarySearch(index.entries);

function resultFor(query: string) {
  const term = readSearchFromUrl(new URLSearchParams(query));
  return {
    term,
    entries: filterLibrarySearch(searchIndex, normalizeLibrarySearchTerm(term)),
  };
}

describe("Library search integration", () => {
  it("crosses F01, F02 and F03 from name search to the grid", () => {
    const result = resultFor("q=DRAGAO");
    render(<CollectionGrid entries={result.entries} emptyLabel="empty" />);
    expect(screen.getByText("Dragão Negro")).toBeTruthy();
    expect(screen.queryByText("Dark Magician")).toBeNull();
  });

  it("crosses F01, F02 and F03 from number search to the grid", () => {
    const result = resultFor("q=3");
    render(<CollectionGrid entries={result.entries} emptyLabel="empty" />);
    expect(screen.getByText("Dark Magician")).toBeTruthy();
  });

  it("shows the PRD message when the integrated search is empty", () => {
    const result = resultFor("q=missing");
    render(<LibrarySearchNoResults term={result.term} />);
    expect(screen.getByText("Nenhuma carta encontrada para 'missing'.")).toBeTruthy();
  });

  it("clearing search restores the grid while preserving filters", () => {
    const params = removeSearchFromUrl(new URLSearchParams("q=missing&status=all"));
    expect(params.toString()).toBe("status=all");
    expect(resultFor(params.toString()).entries).toHaveLength(3);
  });

  it("updates the URL through the field without resetting filters", () => {
    let params = new URLSearchParams("status=all");
    render(
      <LibrarySearchField
        term=""
        onChange={(term) => {
          params = applySearchToUrl(params, term);
        }}
        onClear={() => {
          params = removeSearchFromUrl(params);
        }}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dragon" } });
    expect(params.toString()).toBe("status=all&q=dragon");
  });

  it("preserves q in detail links so F05 can reconstruct the sequence", () => {
    const result = resultFor("q=dragon");
    render(
      <CollectionGrid entries={result.entries} emptyLabel="empty" detailQueryString="q=dragon" />,
    );
    expect(screen.getByRole("link").getAttribute("href")).toBe("/library/001?q=dragon");
  });

  it("filters a complete 722-entry fixture in under two hundred milliseconds", () => {
    const completeEntries = Array.from({ length: 722 }, (_, index) =>
      card(String(index + 1).padStart(3, "0") as CardNumber, `Card ${index + 1}`),
    ).map(
      (currentCard) =>
        ({
          obtained: true,
          cardNumber: currentCard.numero,
          card: currentCard,
          art: { kind: "placeholder" },
        }) as const,
    );
    const completeSearchIndex = prepareLibrarySearch(completeEntries);

    const startedAt = performance.now();
    const result = filterLibrarySearch(completeSearchIndex, normalizeLibrarySearchTerm("Card 722"));
    const elapsed = performance.now() - startedAt;

    expect(result).toHaveLength(1);
    expect(elapsed).toBeLessThanOrEqual(200);
  });
});
