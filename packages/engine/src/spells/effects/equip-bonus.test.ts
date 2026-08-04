import type { Card, MonsterZone } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { equipCombatProviders, sumEquipBonuses } from "./equip-bonus.ts";

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
const axeOfDespair = equip("304", "Axe of Despair");
const laserCannonArmor = equip("305", "Laser Cannon Armor");
const elfsLight = equip("307", "Elf's Light");
const beastFangs = equip("308", "Beast Fangs");
const blackPendant = equip("311", "Black Pendant");
const hornOfTheUnicorn = equip("314", "Horn of the Unicorn");
const dragonTreasure = equip("315", "Dragon Treasure");
const megamorph = equip("657", "Megamorph");

describe("sumEquipBonuses — equipamentos sem restricao", () => {
  it("Axe of Despair soma +1000 ATK e +1000 DEF a qualquer hospedeiro", () => {
    for (const classe of ["Warrior", "Dragon", "Aqua", "Zombie"]) {
      expect(sumEquipBonuses(makeCard({ classe }), [axeOfDespair])).toEqual({
        atk: 1000,
        def: 1000,
      });
    }
  });

  it("Black Pendant soma +500/+500 e Horn of the Unicorn +700/+700", () => {
    expect(sumEquipBonuses(makeCard(), [blackPendant])).toEqual({ atk: 500, def: 500 });
    expect(sumEquipBonuses(makeCard(), [hornOfTheUnicorn])).toEqual({ atk: 700, def: 700 });
  });

  it("Megamorph soma apenas ATK e Laser Cannon Armor apenas DEF", () => {
    expect(sumEquipBonuses(makeCard(), [megamorph])).toEqual({ atk: 1000, def: 0 });
    expect(sumEquipBonuses(makeCard(), [laserCannonArmor])).toEqual({ atk: 0, def: 500 });
  });
});

describe("sumEquipBonuses — restricao de classe", () => {
  const restricted: readonly [Card, string][] = [
    [legendarySword, "Warrior"],
    [darkEnergy, "Fiend"],
    [elfsLight, "Spellcaster"],
    [beastFangs, "Beast"],
    [dragonTreasure, "Dragon"],
  ];

  for (const [card, classe] of restricted) {
    it(`${card.nome} soma +500/+500 em um hospedeiro da classe ${classe}`, () => {
      expect(sumEquipBonuses(makeCard({ classe }), [card])).toEqual({ atk: 500, def: 500 });
    });
  }

  it("Dark Energy nao soma nada a um hospedeiro que nao seja da classe Fiend", () => {
    expect(sumEquipBonuses(makeCard({ classe: "Warrior" }), [darkEnergy])).toEqual({
      atk: 0,
      def: 0,
    });
  });

  it("Legendary Sword nao soma nada em um Dragon, e a jogada continua valida", () => {
    expect(sumEquipBonuses(makeCard({ classe: "Dragon" }), [legendarySword])).toEqual({
      atk: 0,
      def: 0,
    });
  });

  it("Beast-Warrior nao conta como Beast — a comparacao de classe e exata", () => {
    expect(sumEquipBonuses(makeCard({ classe: "Beast-Warrior" }), [beastFangs])).toEqual({
      atk: 0,
      def: 0,
    });
  });
});

describe("sumEquipBonuses — acumulo e casos de borda", () => {
  it("dois equipamentos no mesmo monstro acumulam os bonus", () => {
    expect(
      sumEquipBonuses(makeCard({ classe: "Warrior" }), [legendarySword, axeOfDespair]),
    ).toEqual({ atk: 1500, def: 1500 });
  });

  it("soma so os elegiveis quando um dos equipamentos nao casa com a classe", () => {
    const host = makeCard({ classe: "Dragon" });
    expect(sumEquipBonuses(host, [legendarySword, dragonTreasure, megamorph])).toEqual({
      atk: 1500,
      def: 500,
    });
  });

  it("um monstro sem equipamentos tem bonus zero", () => {
    expect(sumEquipBonuses(makeCard(), [])).toEqual({ atk: 0, def: 0 });
  });

  it("ignora uma carta anexada que nao seja um equipamento de buff", () => {
    const raigeki = makeCard({ numero: "337", nome: "Raigeki", classe: "Magic", tipo: "magica" });
    const unknown = makeCard({ numero: "030", nome: "Sem efeito", tipo: "equipamento" });
    expect(sumEquipBonuses(makeCard(), [raigeki, unknown])).toEqual({ atk: 0, def: 0 });
  });

  it("nao altera o hospedeiro nem a lista de equipamentos", () => {
    const host = makeCard({ classe: "Warrior" });
    const equips = [legendarySword];
    const snapshot = JSON.parse(JSON.stringify({ host, equips })) as unknown;

    sumEquipBonuses(host, equips);

    expect(JSON.parse(JSON.stringify({ host, equips }))).toEqual(snapshot);
  });
});

describe("equipCombatProviders", () => {
  function occupiedZone(
    host: Card,
    equips: readonly Card[],
  ): Extract<MonsterZone, { occupied: true }> {
    return {
      occupied: true,
      card: host,
      position: "attack_face_up",
      hasAttacked: false,
      hasChangedPosition: false,
      equips,
    };
  }

  it("mantem guardiao e terreno neutros e liga apenas o slot de equipamento", () => {
    const host = makeCard({ classe: "Warrior" });
    const providers = equipCombatProviders(occupiedZone(host, [legendarySword]));

    expect(providers.guardian(host, null)).toEqual({ atk: 0, def: 0 });
    expect(providers.terrain(host, null)).toEqual({ atk: 0, def: 0 });
    expect(providers.equipment(host)).toEqual({ atk: 500, def: 500 });
  });

  it("uma zona sem equipamentos devolve modificador zero nos tres slots", () => {
    const host = makeCard();
    const providers = equipCombatProviders(occupiedZone(host, []));

    expect(providers.equipment(host)).toEqual({ atk: 0, def: 0 });
  });
});
