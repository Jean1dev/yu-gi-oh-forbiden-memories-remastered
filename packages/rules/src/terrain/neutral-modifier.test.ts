import type { Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { neutralTerrainModifier } from "./neutral-modifier.ts";

const monster: Card = {
  id: 1,
  numero: "001",
  nome: "Test Monster",
  img: null,
  classe: "Dragon",
  atk: 3000,
  def: 2500,
  guardiao1: null,
  guardiao2: null,
  password: null,
  estrelas: null,
  tipo: "monstro",
};

const activeField: Card = { ...monster, numero: "500", classe: "Magic", tipo: "magica" };

describe("neutralTerrainModifier", () => {
  const cases = [
    { name: "with an active field", activeField },
    { name: "without an active field", activeField: null },
  ] as const;

  for (const item of cases) {
    it(`always returns atk 0 and def 0 ${item.name}`, () => {
      expect(neutralTerrainModifier(monster, item.activeField)).toEqual({ atk: 0, def: 0 });
    });
  }
});
