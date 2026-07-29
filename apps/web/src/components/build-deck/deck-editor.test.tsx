// @vitest-environment jsdom
import type { Card, CardCatalogLookup, DeckDraft } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeckEditor } from "./deck-editor.tsx";

function card(numero: string, nome: string): Card {
  return {
    id: 1,
    numero,
    nome,
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

function catalogFrom(cards: readonly Card[]): CardCatalogLookup {
  const byNumber = new Map(cards.map((c) => [c.numero, c] as const));
  return (numero) => byNumber.get(numero);
}

describe("DeckEditor", () => {
  it("lists every card in the draft with its quantity and the running total", () => {
    const dragon = card("001", "Blue-eyes White Dragon");
    const draft: DeckDraft = new Map([["001", 2]]);

    render(
      <DeckEditor
        draft={draft}
        catalog={catalogFrom([dragon])}
        total={2}
        selectedCard={undefined}
        canAddCard={true}
        onAddCard={vi.fn()}
        onRemoveCard={vi.fn()}
      />,
    );

    expect(screen.getByText("Blue-eyes White Dragon")).toBeTruthy();
    expect(screen.getByText("x2")).toBeTruthy();
    expect(screen.getByText("Total no deck: 2")).toBeTruthy();
  });

  it("shows the add prompt when no card is selected", () => {
    render(
      <DeckEditor
        draft={new Map()}
        catalog={catalogFrom([])}
        total={0}
        selectedCard={undefined}
        canAddCard={true}
        onAddCard={vi.fn()}
        onRemoveCard={vi.fn()}
      />,
    );

    expect(screen.getByText("Selecione uma carta na coleção para adicionar.")).toBeTruthy();
  });

  it("calls onAddCard with the selected card number when the add button is clicked", () => {
    const onAddCard = vi.fn();

    render(
      <DeckEditor
        draft={new Map()}
        catalog={catalogFrom([])}
        total={0}
        selectedCard={{ numero: "001", nome: "Blue-eyes White Dragon" }}
        canAddCard={true}
        onAddCard={onAddCard}
        onRemoveCard={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "＋ Adicionar Blue-eyes White Dragon ao deck" }));

    expect(onAddCard).toHaveBeenCalledWith("001");
  });

  it("disables the add button when canAddCard is false", () => {
    render(
      <DeckEditor
        draft={new Map()}
        catalog={catalogFrom([])}
        total={0}
        selectedCard={{ numero: "001", nome: "Blue-eyes White Dragon" }}
        canAddCard={false}
        onAddCard={vi.fn()}
        onRemoveCard={vi.fn()}
      />,
    );

    expect((screen.getByRole("button", { name: /Adicionar/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls onRemoveCard with the card number when its remove button is clicked", () => {
    const onRemoveCard = vi.fn();
    const dragon = card("001", "Blue-eyes White Dragon");

    render(
      <DeckEditor
        draft={new Map([["001", 1]])}
        catalog={catalogFrom([dragon])}
        total={1}
        selectedCard={undefined}
        canAddCard={true}
        onAddCard={vi.fn()}
        onRemoveCard={onRemoveCard}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remover uma cópia de Blue-eyes White Dragon" }));

    expect(onRemoveCard).toHaveBeenCalledWith("001");
  });
});
