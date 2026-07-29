// @vitest-environment jsdom
import type { Card, LibraryEntry } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CollectionGrid } from "./collection-grid.tsx";

function card(numero: string): Card {
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

function obtainedEntry(numero: string): LibraryEntry {
  return { obtained: true, cardNumber: numero, card: card(numero), art: { kind: "placeholder" } };
}

function blockedEntry(numero: string): LibraryEntry {
  return { obtained: false, cardNumber: numero, art: { kind: "silhouette" } };
}

describe("CollectionGrid", () => {
  it("renders one cell per received entry", () => {
    const entries = [obtainedEntry("001"), obtainedEntry("002"), obtainedEntry("003")];
    render(<CollectionGrid entries={entries} emptyLabel="vazio" />);

    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("preserves the order of the received entries", () => {
    const entries = [obtainedEntry("003"), obtainedEntry("001"), obtainedEntry("002")];
    render(<CollectionGrid entries={entries} emptyLabel="vazio" />);

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/library/003", "/library/001", "/library/002"]);
  });

  it("renders the grid as a semantic list with one item per card", () => {
    const entries = [obtainedEntry("001"), obtainedEntry("002")];
    render(<CollectionGrid entries={entries} emptyLabel="vazio" />);

    const list = screen.getByRole("list");
    expect(list.querySelectorAll("li")).toHaveLength(2);
  });

  it("does not filter or reorder the received entries", () => {
    const entries = [blockedEntry("005"), obtainedEntry("001"), blockedEntry("003")];
    render(<CollectionGrid entries={entries} emptyLabel="vazio" />);

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/library/005", "/library/001", "/library/003"]);
  });

  it("renders all 722 entries when the status includes not-obtained", () => {
    const entries = Array.from({ length: 722 }, (_, index) => {
      const numero = String(index + 1).padStart(3, "0");
      return index % 2 === 0 ? obtainedEntry(numero) : blockedEntry(numero);
    });
    render(<CollectionGrid entries={entries} emptyLabel="vazio" />);

    expect(screen.getAllByRole("link")).toHaveLength(722);
  });
});
