// @vitest-environment jsdom
import type { ArtReference, Card } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MonsterCardFrame } from "./monster-card-frame.tsx";

const CARD: Card = {
  id: 1,
  numero: "001",
  nome: "Blue-Eyes White Dragon",
  img: null,
  classe: "Dragon",
  atk: 3000,
  def: 2500,
  guardiao1: null,
  guardiao2: null,
  password: "89 63 11 39",
  estrelas: 999_999,
  tipo: "monstro",
  atributo: "LIGHT",
  nivel: 8,
  descricao: "This legendary dragon is a powerful engine of destruction.",
};

const ART: ArtReference = { kind: "art", path: "/cards-data/art/001.jpg" };

describe("MonsterCardFrame", () => {
  it("renders name, attribute badge, level stars, race, description and ATK/DEF in full size", () => {
    render(<MonsterCardFrame card={CARD} art={ART} />);

    expect(screen.getByText("Blue-Eyes White Dragon")).toBeTruthy();
    expect(screen.getByRole("img", { name: "LIGHT" })).toBeTruthy();
    expect(screen.getByText("[Dragon]")).toBeTruthy();
    expect(
      screen.getByText("This legendary dragon is a powerful engine of destruction."),
    ).toBeTruthy();
    expect(screen.getByText("ATK 3000")).toBeTruthy();
    expect(screen.getByText("DEF 2500")).toBeTruthy();
  });

  it("renders exactly nivel stars", () => {
    render(<MonsterCardFrame card={CARD} art={ART} />);

    expect(screen.getByLabelText("nível 8").textContent).toBe("★".repeat(8));
  });

  it("renders only art, name and ATK/DEF in compact size", () => {
    render(<MonsterCardFrame card={CARD} art={ART} size="compacto" />);

    expect(screen.getByText("Blue-Eyes White Dragon")).toBeTruthy();
    expect(screen.getByText("ATK 3000 / DEF 2500")).toBeTruthy();
    expect(screen.queryByText(CARD.descricao ?? "")).toBeNull();
    expect(screen.queryByRole("img", { name: "LIGHT" })).toBeNull();
  });

  it("falls back to the placeholder art state", () => {
    render(<MonsterCardFrame card={CARD} art={{ kind: "placeholder" }} />);

    expect(screen.getByTestId("card-art-placeholder")).toBeTruthy();
  });
});
