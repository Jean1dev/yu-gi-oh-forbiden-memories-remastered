import type { Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { neutralEquipmentModifier } from "./neutral-equipment-modifier.ts";

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

describe("neutralEquipmentModifier", () => {
  it("always returns atk 0 and def 0", () => {
    expect(neutralEquipmentModifier(monster)).toEqual({ atk: 0, def: 0 });
  });
});
