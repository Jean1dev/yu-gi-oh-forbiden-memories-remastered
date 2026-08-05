// @vitest-environment jsdom
import type { ArtReference, Card } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SpellTrapCardFrame } from "./spell-trap-card-frame.tsx";

const SPELL_CARD: Card = {
  id: 320,
  numero: "320",
  nome: "Stop Defense",
  img: null,
  classe: "Magic",
  atk: null,
  def: null,
  guardiao1: null,
  guardiao2: null,
  password: "63 10 20 17",
  estrelas: 800,
  tipo: "magica",
  atributo: null,
  nivel: null,
  descricao: "Select 1 Defense Position monster on your opponent's side and change it to Attack Position.",
};

const TRAP_CARD: Card = { ...SPELL_CARD, numero: "681", nome: "House of Adhesive Tape", tipo: "armadilha" };

const ART: ArtReference = { kind: "art", path: "/cards-data/art/320.jpg" };

describe("SpellTrapCardFrame", () => {
  it("renders name, badge, art and description in full size", () => {
    render(<SpellTrapCardFrame card={SPELL_CARD} art={ART} />);

    expect(screen.getByText("Stop Defense")).toBeTruthy();
    expect(screen.getByRole("img", { name: "MAGIA" })).toBeTruthy();
    expect(screen.getByText(SPELL_CARD.descricao ?? "")).toBeTruthy();
  });

  it("never renders stars or ATK/DEF", () => {
    render(<SpellTrapCardFrame card={SPELL_CARD} art={ART} />);

    expect(screen.queryByText(/ATK/)).toBeNull();
    expect(screen.queryByText(/DEF/)).toBeNull();
    expect(screen.queryByText("★")).toBeNull();
  });

  it("renders only art and name in compact size", () => {
    render(<SpellTrapCardFrame card={SPELL_CARD} art={ART} size="compacto" />);

    expect(screen.getByText("Stop Defense")).toBeTruthy();
    expect(screen.queryByText(SPELL_CARD.descricao ?? "")).toBeNull();
  });

  it("renders the trap badge for tipo armadilha", () => {
    render(<SpellTrapCardFrame card={TRAP_CARD} art={ART} />);

    expect(screen.getByRole("img", { name: "ARMADILHA" })).toBeTruthy();
  });

  it("falls back to the placeholder art state", () => {
    render(<SpellTrapCardFrame card={SPELL_CARD} art={{ kind: "placeholder" }} />);

    expect(screen.getByTestId("card-art-placeholder")).toBeTruthy();
  });
});
