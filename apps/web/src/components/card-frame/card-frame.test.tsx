// @vitest-environment jsdom
import type { ArtReference, Card } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardFrame } from "./card-frame.tsx";

const ART: ArtReference = { kind: "art", path: "/cards-data/art/001.jpg" };

const MONSTER: Card = {
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

const SPELL: Card = {
  ...MONSTER,
  numero: "320",
  nome: "Stop Defense",
  tipo: "magica",
  atributo: null,
  nivel: null,
};

describe("CardFrame", () => {
  it("renders MonsterCardFrame when tipo is monstro", () => {
    render(<CardFrame card={MONSTER} art={ART} />);

    expect(screen.getByRole("img", { name: "LIGHT" })).toBeTruthy();
  });

  it("renders SpellTrapCardFrame when tipo is not monstro", () => {
    render(<CardFrame card={SPELL} art={ART} />);

    expect(screen.getByRole("img", { name: "MAGIA" })).toBeTruthy();
  });
});
