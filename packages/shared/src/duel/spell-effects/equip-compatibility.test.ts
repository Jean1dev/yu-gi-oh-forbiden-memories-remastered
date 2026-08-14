import { describe, expect, it } from "vitest";

import {
  equipCardNumbers,
  equipCompatibleHosts,
  isEquipCompatible,
} from "./equip-compatibility.ts";

/** Every monster in the game; both unrestricted equips must reach exactly this many. */
const MONSTER_COUNT = 621;

describe("equip compatibility", () => {
  it("cobre os 34 equipamentos do jogo original", () => {
    expect(equipCardNumbers()).toHaveLength(34);
  });

  it("aceita qualquer monstro nos dois equipamentos irrestritos", () => {
    // 657 Megamorph e 668 Bright Castle. Sao os unicos cuja lista coincide com
    // "todos os monstros" — o resto e curado carta a carta.
    expect(equipCompatibleHosts("657").size).toBe(MONSTER_COUNT);
    expect(equipCompatibleHosts("668").size).toBe(MONSTER_COUNT);
  });

  it("restringe a um unico hospedeiro os equipamentos de carta unica", () => {
    expect([...equipCompatibleHosts("318")]).toEqual(["062"]); // Elegant Egotist -> Harpie Lady
    expect([...equipCompatibleHosts("652")]).toEqual(["366"]); // Magical Labyrinth -> Labyrinth Wall
    expect([...equipCompatibleHosts("658")]).toEqual(["391"]); // Metalmorph -> Zoa
  });

  it("nao deriva de classe: Harpie Lady e Winged Beast e aceita Book of Secret Arts", () => {
    // 323 Book of Secret Arts "aumenta o poder de magos" no texto, mas a lista
    // do jogo inclui 062 Harpie Lady, que e `Winged Beast`. E por isso que a
    // tabela e extraida e nao aproximada por `classe`
    // (`docs/spells/equip-buffs.md` §2).
    expect(isEquipCompatible("323", "062")).toBe(true);
    // 582 Dark Witch e `Fairy` e aceita tanto Book of Secret Arts quanto
    // 312 Silver Bow and Arrow.
    expect(isEquipCompatible("323", "582")).toBe(true);
    expect(isEquipCompatible("312", "582")).toBe(true);
  });

  it("recusa um hospedeiro fora da lista", () => {
    // 315 Dragon Treasure em 012 Swamp Battleguard, que e Warrior.
    expect(isEquipCompatible("315", "012")).toBe(false);
  });

  it("devolve false para uma carta que nao e equipamento", () => {
    // 337 Raigeki e magica; consultar a compatibilidade dela nao pode explodir.
    expect(isEquipCompatible("337", "001")).toBe(false);
    expect(equipCompatibleHosts("337").size).toBe(0);
  });

  it("nao devolve nada herdado do prototipo", () => {
    for (const key of ["__proto__", "valueOf", "toString", "constructor"]) {
      expect(equipCompatibleHosts(key).size).toBe(0);
      expect(isEquipCompatible(key, "001")).toBe(false);
    }
  });
});
