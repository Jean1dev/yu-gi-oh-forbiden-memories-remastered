// @vitest-environment jsdom
import { queryLibraryEntries } from "@yugioh/rules";
import {
  DEFAULT_LIBRARY_FILTERS,
  type Card,
  type CardNumber,
  type LibraryEntry,
} from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CollectionGrid } from "../src/components/library/collection-grid.tsx";
import { clearLibraryFiltersUrl, parseLibraryFiltersUrl } from "../src/lib/library/filters-url.ts";

function obtained(cardNumber: CardNumber, type: Card["tipo"], atk: number | null): LibraryEntry {
  const card: Card = {
    id: Number(cardNumber),
    numero: cardNumber,
    nome: `Card ${cardNumber}`,
    img: null,
    classe: "Dragon",
    atk,
    def: atk,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: atk,
    tipo: type,
  };
  return { obtained: true, cardNumber, card, art: { kind: "placeholder" } };
}

const blocked: LibraryEntry = {
  obtained: false,
  cardNumber: "003",
  art: { kind: "silhouette" },
};
const entries = [obtained("001", "monstro", 100), obtained("002", "magica", null), blocked];

function query(search: string) {
  return queryLibraryEntries({
    entries,
    filters: parseLibraryFiltersUrl(new URLSearchParams(search)).filters,
  });
}

describe("Library filters integration", () => {
  it("renders obtained and blocked entries for status all", () => {
    const result = query("status=todas");
    render(<CollectionGrid entries={result.entries} emptyLabel="empty" />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByText("???")).toBeTruthy();
  });

  it("renders only blocked cells for not-obtained status", () => {
    const result = query("status=nao-obtidas");
    render(<CollectionGrid entries={result.entries} emptyLabel="empty" />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("???")).toBeTruthy();
  });

  it("renders only obtained monsters for the monster type", () => {
    const result = query("tipo=monstro");
    expect(result.entries.map((entry) => entry.cardNumber)).toEqual(["001"]);
  });

  it("does not reveal blocked cards under a specific type with status all", () => {
    const result = query("status=todas&tipo=monstro");
    expect(result.entries.every((entry) => entry.obtained)).toBe(true);
  });

  it("keeps the displayed ATK-desc sequence in detail links", () => {
    const result = query("status=todas&ordem=atk&direcao=desc");
    render(
      <CollectionGrid
        entries={result.entries}
        emptyLabel="empty"
        detailQueryString="status=todas&ordem=atk&direcao=desc"
      />,
    );
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/library/001?status=todas&ordem=atk&direcao=desc",
      "/library/002?status=todas&ordem=atk&direcao=desc",
      "/library/003?status=todas&ordem=atk&direcao=desc",
    ]);
  });

  it("clears filters without changing q or producing collection writes", () => {
    const result = clearLibraryFiltersUrl(
      new URLSearchParams("q=dragon&status=todas&ordem=atk&direcao=desc"),
    );
    expect(result.toString()).toBe("q=dragon");
    expect(clearLibraryFiltersUrl.toString()).not.toMatch(
      /collections|insert|update|upsert|delete/u,
    );
  });

  it("uses defaults when the collection is recalculated with the same active URL", () => {
    const filters = parseLibraryFiltersUrl(new URLSearchParams()).filters;
    const initial = queryLibraryEntries({ entries: [], filters });
    const reloaded = queryLibraryEntries({ entries, filters });
    expect(initial.entries).toHaveLength(0);
    expect(reloaded.entries.map((entry) => entry.cardNumber)).toEqual(["001", "002"]);
    expect(filters).toEqual(DEFAULT_LIBRARY_FILTERS);
  });
});
