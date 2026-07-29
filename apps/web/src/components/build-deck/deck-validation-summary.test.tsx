// @vitest-environment jsdom
import type { Card, CardCatalogLookup } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { UseDeckValidationResult } from "../../hooks/use-deck-validation.ts";
import { DeckValidationSummary } from "./deck-validation-summary.tsx";

const emptyCatalog: CardCatalogLookup = () => undefined;

function card(numero: string, nome: string): Card {
  return {
    id: 1,
    numero,
    nome,
    img: null,
    classe: "Spellcaster",
    atk: 2500,
    def: 2100,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

describe("DeckValidationSummary", () => {
  it("shows the counter and no violation list while loading", () => {
    const validation: UseDeckValidationResult = { valid: false, total: 12, violations: [], loading: true };
    const { container } = render(<DeckValidationSummary validation={validation} catalog={emptyCatalog} />);

    expect(screen.getByText("12/40")).toBeTruthy();
    expect(container.querySelector("ul")).toBeNull();
  });

  it("shows the counter and no violations when the deck is valid", () => {
    const validation: UseDeckValidationResult = { valid: true, total: 40, violations: [], loading: false };
    const { container } = render(<DeckValidationSummary validation={validation} catalog={emptyCatalog} />);

    expect(screen.getByText("40/40")).toBeTruthy();
    expect(container.querySelector("ul")).toBeNull();
  });

  it("lists each violation formatted, resolving the card name from the catalog", () => {
    const catalog: CardCatalogLookup = (numero) => (numero === "045" ? card("045", "Dark Magician") : undefined);
    const validation: UseDeckValidationResult = {
      valid: false,
      total: 38,
      violations: [
        { type: "insufficient_total", missing: 2 },
        { type: "copy_limit_exceeded", cardNumber: "045", quantityInDraft: 4 },
      ],
      loading: false,
    };

    render(<DeckValidationSummary validation={validation} catalog={catalog} />);

    expect(screen.getByText("38/40")).toBeTruthy();
    expect(screen.getByText("Faltam 2 cartas para 40")).toBeTruthy();
    expect(screen.getByText("Dark Magician: 4 cópias (máx. 3)")).toBeTruthy();
  });

  it("falls back to the card number when the catalog does not know the card", () => {
    const validation: UseDeckValidationResult = {
      valid: false,
      total: 40,
      violations: [{ type: "exceeds_owned_quantity", cardNumber: "500", quantityInDraft: 2, quantityOwned: 1 }],
      loading: false,
    };

    render(<DeckValidationSummary validation={validation} catalog={emptyCatalog} />);

    expect(screen.getByText("500: além do que possui (1)")).toBeTruthy();
  });
});
