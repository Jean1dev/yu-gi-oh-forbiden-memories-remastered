import type { Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { neutralGuardianModifier } from "./neutral-modifier.ts";

const monster: Card = {
  id: 1,
  numero: "001",
  nome: "Test Monster",
  img: null,
  classe: "Dragon",
  atk: 3000,
  def: 2500,
  guardiao1: "Sun",
  guardiao2: "Mars",
  password: null,
  estrelas: null,
  tipo: "monstro",
};

const opponent: Card = { ...monster, numero: "002", guardiao1: "Moon", guardiao2: null };

describe("neutralGuardianModifier", () => {
  const cases = [
    { name: "with an opponent", opponent },
    { name: "without an opponent", opponent: null },
  ] as const;

  for (const item of cases) {
    it(`always returns atk 0 and def 0 ${item.name}`, () => {
      expect(neutralGuardianModifier(monster, item.opponent)).toEqual({ atk: 0, def: 0 });
    });
  }
});
