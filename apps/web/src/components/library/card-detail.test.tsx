// @vitest-environment jsdom
import type { Card, LibraryEntry } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardDetail, type ObtainedLibraryEntry } from "./card-detail.tsx";

function obtainedEntry(overrides: Partial<Card> = {}): ObtainedLibraryEntry {
  const card: Card = {
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
    ...overrides,
  };
  return {
    obtained: true,
    cardNumber: card.numero,
    card,
    art: { kind: "placeholder" },
  };
}

describe("CardDetail", () => {
  it("shows every applicable canonical field for an obtained card", () => {
    render(<CardDetail entry={obtainedEntry()} returnDestination="/library" />);

    for (const value of [
      "Blue-Eyes White Dragon",
      "001",
      "Dragon",
      "monstro",
      "3000",
      "2500",
      "Sun",
      "Mars",
      "89 63 14 30",
      "999999",
    ]) {
      expect(screen.getByText(value)).toBeTruthy();
    }
    expect(screen.getByTestId("card-art-placeholder")).toBeTruthy();
  });

  it("hides empty attack and defense instead of rendering blank fields", () => {
    render(
      <CardDetail
        entry={obtainedEntry({ atk: null, def: null, tipo: "magica" })}
        returnDestination="/library"
      />,
    );

    expect(screen.queryByText("Combate")).toBeNull();
    expect(screen.queryByText("ATK")).toBeNull();
    expect(screen.queryByText("DEF")).toBeNull();
  });

  it("shows guardians only as labels and omits their block when absent", () => {
    const { rerender } = render(
      <CardDetail entry={obtainedEntry()} returnDestination="/library" />,
    );

    expect(screen.getByText("Guardiões Estelares")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/vantagem|desvantagem|bônus/i);

    rerender(
      <CardDetail
        entry={obtainedEntry({ guardiao1: null, guardiao2: null })}
        returnDestination="/library"
      />,
    );
    expect(screen.queryByText("Guardiões Estelares")).toBeNull();
  });

  it("shows unavailable catalog values without inventing a password or price", () => {
    render(
      <CardDetail
        entry={obtainedEntry({ password: null, estrelas: null })}
        returnDestination="/library"
      />,
    );

    expect(screen.getByText("Senha indisponível.")).toBeTruthy();
    expect(screen.getByText("Preço indisponível.")).toBeTruthy();
  });

  it("shows password as text without copy, collection quantity or pending rule sections", () => {
    const { container } = render(
      <CardDetail entry={obtainedEntry()} returnDestination="/library?q=dragon&type=monstro" />,
    );
    const text = container.textContent ?? "";

    expect(screen.getByText("89 63 14 30")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /copiar/i })).toBeNull();
    expect(text).not.toMatch(/quantidade|cópias|fusões|drops|terreno/i);
    expect(screen.getByRole("link", { name: "Voltar para a Library" }).getAttribute("href")).toBe(
      "/library?q=dragon&type=monstro",
    );
  });

  it("renders CardFrame instead of the legacy image when the card is migrated", () => {
    const entry: ObtainedLibraryEntry = {
      ...obtainedEntry({
        atributo: "LIGHT",
        nivel: 8,
        descricao: "This legendary dragon is a powerful engine of destruction.",
      }),
      cropArt: { kind: "art", path: "/cards-data/art/001.jpg" },
    };

    render(<CardDetail entry={entry} returnDestination="/library" />);

    expect(screen.getByRole("img", { name: "LIGHT" })).toBeTruthy();
  });

  it("keeps rendering the legacy image for a card without cropArt (regression fallback)", () => {
    render(<CardDetail entry={obtainedEntry()} returnDestination="/library" />);

    expect(screen.queryByRole("img", { name: "LIGHT" })).toBeNull();
    expect(screen.getByTestId("card-art-placeholder")).toBeTruthy();
  });

  it("accepts only an obtained entry at its public boundary", () => {
    const blocked: LibraryEntry = {
      obtained: false,
      cardNumber: "002",
      art: { kind: "silhouette" },
    };

    expect(blocked).not.toHaveProperty("card");
  });
});
