// @vitest-environment jsdom
import type { Card } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DuelCardPreview } from "./duel-card-preview.tsx";

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
};

describe("DuelCardPreview", () => {
  it("renders nothing when there is no card", () => {
    const { container } = render(<DuelCardPreview card={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders CardFrame (full) instead of the legacy image when the card is migrated", () => {
    const migratedCard: Card = {
      ...CARD,
      atributo: "LIGHT",
      nivel: 8,
      descricao: "A powerful dragon.",
    };

    render(<DuelCardPreview card={migratedCard} />);

    expect(screen.getByRole("img", { name: "LIGHT" })).toBeTruthy();
  });

  it("keeps rendering the legacy image for a card without descricao (regression fallback)", () => {
    render(<DuelCardPreview card={CARD} />);

    expect(screen.queryByRole("img", { name: "LIGHT" })).toBeNull();
    expect(screen.getByText("Blue-Eyes White Dragon")).toBeTruthy();
  });
});
