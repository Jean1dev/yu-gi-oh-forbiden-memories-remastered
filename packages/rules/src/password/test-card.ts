import type { Card } from "@yugioh/shared";

export const passwordTestCard = (overrides: Partial<Card> = {}): Card => ({
  id: 1,
  numero: "001",
  nome: "Blue-eyes White Dragon",
  img: null,
  classe: "Dragon",
  atk: 3000,
  def: 2500,
  guardiao1: "Sun",
  guardiao2: "Mars",
  password: "89 63 11 39",
  estrelas: 999_999,
  tipo: "monstro",
  ...overrides,
});
