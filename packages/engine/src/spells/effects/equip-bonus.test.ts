import type { Card, MonsterZone } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { cursePenalty, sumEquipBonuses, zoneCombatProviders } from "./equip-bonus.ts";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Test Card",
    img: null,
    classe: "Warrior",
    atk: 1000,
    def: 800,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
    ...overrides,
  };
}

/** An equip card as it exists in the dataset: `tipo: "equipamento"`, no atk/def of its own. */
function equip(numero: string, nome: string): Card {
  return makeCard({ numero, nome, classe: "Equip", atk: null, def: null, tipo: "equipamento" });
}

const legendarySword = equip("301", "Legendary Sword");
const darkEnergy = equip("303", "Dark Energy");
const bookOfSecretArts = equip("323", "Book of Secret Arts");
const dragonTreasure = equip("315", "Dragon Treasure");
const megamorph = equip("657", "Megamorph");

// Real monsters, with the compatibility the original game actually declares.
const blueEyes = makeCard({ numero: "001", nome: "Blue-eyes White Dragon", classe: "Dragon" });
const swampBattleguard = makeCard({ numero: "012", nome: "Swamp Battleguard", classe: "Warrior" });
const mysticalElf = makeCard({ numero: "002", nome: "Mystical Elf", classe: "Spellcaster" });
const harpieLady = makeCard({ numero: "062", nome: "Harpie Lady", classe: "Winged Beast" });

describe("sumEquipBonuses", () => {
  it("soma +500/+500 num hospedeiro que o jogo original aceita", () => {
    expect(sumEquipBonuses(swampBattleguard, [legendarySword])).toEqual({ atk: 500, def: 500 });
    expect(sumEquipBonuses(blueEyes, [dragonTreasure])).toEqual({ atk: 500, def: 500 });
  });

  it("Megamorph dobra, e aceita qualquer monstro", () => {
    for (const host of [blueEyes, swampBattleguard, mysticalElf, harpieLady]) {
      expect(sumEquipBonuses(host, [megamorph])).toEqual({ atk: 1000, def: 1000 });
    }
  });

  it("nao soma nada num hospedeiro fora da lista, e a jogada continua valida", () => {
    expect(sumEquipBonuses(blueEyes, [legendarySword])).toEqual({ atk: 0, def: 0 });
    expect(sumEquipBonuses(mysticalElf, [darkEnergy])).toEqual({ atk: 0, def: 0 });
  });

  it("a compatibilidade nao segue a classe: Harpie Lady e Winged Beast e aceita Book of Secret Arts", () => {
    expect(sumEquipBonuses(harpieLady, [bookOfSecretArts])).toEqual({ atk: 500, def: 500 });
    // E Blue-eyes, que tampouco e Spellcaster, nao aceita.
    expect(sumEquipBonuses(blueEyes, [bookOfSecretArts])).toEqual({ atk: 0, def: 0 });
  });

  it("dois equipamentos no mesmo monstro acumulam os bonus", () => {
    expect(sumEquipBonuses(blueEyes, [dragonTreasure, megamorph])).toEqual({
      atk: 1500,
      def: 1500,
    });
  });

  it("soma so os elegiveis quando um dos equipamentos nao aceita o hospedeiro", () => {
    expect(sumEquipBonuses(blueEyes, [legendarySword, dragonTreasure, megamorph])).toEqual({
      atk: 1500,
      def: 1500,
    });
  });

  it("um monstro sem equipamentos tem bonus zero", () => {
    expect(sumEquipBonuses(makeCard(), [])).toEqual({ atk: 0, def: 0 });
  });

  it("ignora uma carta anexada que nao seja um equipamento de buff", () => {
    const raigeki = makeCard({ numero: "337", nome: "Raigeki", classe: "Magic", tipo: "magica" });
    const trap = makeCard({ numero: "683", nome: "Bear Trap", classe: "Trap", tipo: "armadilha" });
    expect(sumEquipBonuses(swampBattleguard, [raigeki, trap])).toEqual({ atk: 0, def: 0 });
  });

  it("nao altera o hospedeiro nem a lista de equipamentos", () => {
    const equips = [legendarySword];
    const snapshot = JSON.parse(JSON.stringify({ swampBattleguard, equips })) as unknown;

    sumEquipBonuses(swampBattleguard, equips);

    expect(JSON.parse(JSON.stringify({ swampBattleguard, equips }))).toEqual(snapshot);
  });
});

describe("cursePenalty", () => {
  it("tira 500 por level, nos dois eixos", () => {
    expect(cursePenalty(1)).toEqual({ atk: -500, def: -500 });
    expect(cursePenalty(2)).toEqual({ atk: -1000, def: -1000 });
  });

  it("uma zona sem maldicao nao tira nada", () => {
    expect(cursePenalty(undefined)).toEqual({ atk: 0, def: 0 });
    expect(cursePenalty(0)).toEqual({ atk: 0, def: 0 });
  });
});

describe("zoneCombatProviders", () => {
  function occupiedZone(
    host: Card,
    equips: readonly Card[],
    curseLevels?: number,
  ): Extract<MonsterZone, { occupied: true }> {
    return {
      occupied: true,
      card: host,
      position: "attack_face_up",
      hasAttacked: false,
      hasChangedPosition: false,
      equips,
      ...(curseLevels === undefined ? {} : { curseLevels }),
    };
  }

  it("mantem guardiao e terreno neutros e liga apenas o slot de equipamento", () => {
    const providers = zoneCombatProviders(occupiedZone(swampBattleguard, [legendarySword]));

    expect(providers.guardian(swampBattleguard, null)).toEqual({ atk: 0, def: 0 });
    expect(providers.terrain(swampBattleguard, null)).toEqual({ atk: 0, def: 0 });
    expect(providers.equipment(swampBattleguard)).toEqual({ atk: 500, def: 500 });
  });

  it("uma zona sem equipamentos nem maldicao devolve modificador zero", () => {
    const providers = zoneCombatProviders(occupiedZone(makeCard(), []));

    expect(providers.equipment(makeCard())).toEqual({ atk: 0, def: 0 });
  });

  it("a maldicao entra no mesmo slot e se compensa com o equipamento", () => {
    // Shadow Spell (2 levels) num monstro com Legendary Sword: -1000 +500.
    const providers = zoneCombatProviders(occupiedZone(swampBattleguard, [legendarySword], 2));

    expect(providers.equipment(swampBattleguard)).toEqual({ atk: -500, def: -500 });
  });

  it("a maldicao sozinha derruba o monstro sem piso", () => {
    const providers = zoneCombatProviders(occupiedZone(swampBattleguard, [], 3));

    expect(providers.equipment(swampBattleguard)).toEqual({ atk: -1500, def: -1500 });
  });
});
