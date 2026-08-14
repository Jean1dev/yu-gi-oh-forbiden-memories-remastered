import { describe, expect, it } from "vitest";

import type { Card } from "../../card/types.ts";
import { matchesClassFilter } from "./class-filter.ts";
import { equipCardNumbers } from "./equip-compatibility.ts";
import { spellPlayMode } from "./play-mode.ts";
import { SpellEffectSchema } from "./schema.ts";
import { SPELL_EFFECTS, getSpellEffect, requiresSpellTarget } from "./table.ts";

/**
 * The dataset's 33 `magica` cards. The 34 `equipamento` ones are not repeated
 * here — they are cross-checked against the extracted compatibility table
 * instead, which is an independent source.
 */
const MAGIC_CARDS = [
  "320", "329", "330", "331", "332", "333", "334", "335", "336", "337",
  "338", "339", "340", "341", "342", "343", "344", "345", "346", "347",
  "348", "349", "350", "653", "655", "656", "660", "661", "662", "663",
  "664", "669", "672",
];

const TERRAIN_CARDS = ["330", "331", "332", "333", "334", "335"];

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Test Card",
    img: null,
    classe: "Warrior",
    atk: null,
    def: null,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "magica",
    ...overrides,
  };
}

describe("SPELL_EFFECTS", () => {
  it("cobre exatamente as 67 cartas de magia e equipamento do dataset", () => {
    expect(Object.keys(SPELL_EFFECTS).sort()).toEqual(
      [...MAGIC_CARDS, ...equipCardNumbers()].sort(),
    );
  });

  it("todo efeito da tabela satisfaz SpellEffectSchema", () => {
    for (const [numero, effect] of Object.entries(SPELL_EFFECTS)) {
      const parsed = SpellEffectSchema.safeParse(effect);
      expect(parsed.success, `carta ${numero}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    }
  });

  it("as seis cartas de terreno 330-335 sao do tipo terrain, e nenhuma outra e", () => {
    const terrains = Object.entries(SPELL_EFFECTS)
      .filter(([, effect]) => effect.type === "terrain")
      .map(([numero]) => numero);

    expect(terrains.sort()).toEqual(TERRAIN_CARDS);
  });

  it("as cartas equip_buff sao exatamente as que tem lista de compatibilidade", () => {
    // As duas tabelas descrevem o mesmo conjunto por caminhos independentes:
    // esta e autorada, a de compatibilidade e extraida do `equipinfo`. Uma
    // divergencia aqui significa que uma das duas ficou para tras.
    const buffs = Object.entries(SPELL_EFFECTS)
      .filter(([, effect]) => effect.type === "equip_buff")
      .map(([numero]) => numero)
      .sort();

    expect(buffs).toEqual([...equipCardNumbers()].sort());
  });

  it("todo equipamento da +500/+500, e so Megamorph dobra", () => {
    for (const [numero, effect] of Object.entries(SPELL_EFFECTS)) {
      if (effect.type !== "equip_buff") continue;
      const expected = numero === "657" ? 1000 : 500;
      expect({ numero, atk: effect.atk, def: effect.def }).toEqual({
        numero,
        atk: expected,
        def: expected,
      });
    }
  });

  it("302 e 306 sao equipamentos, nao efeitos imediatos", () => {
    // O texto do jogo original descreve as duas como power-up; o `tipo` do
    // dataset nunca decidiu o roteamento, a tabela decide.
    expect(SPELL_EFFECTS["302"]).toMatchObject({ type: "equip_buff" });
    expect(SPELL_EFFECTS["306"]).toMatchObject({ type: "equip_buff" });
  });

  it("segue os numeros do jogo original nas cartas de life points", () => {
    expect(SPELL_EFFECTS["343"]).toEqual({ type: "life_points", side: "opponent", delta: -50 });
    expect(SPELL_EFFECTS["341"]).toEqual({ type: "life_points", side: "caster", delta: 2000 });
    expect(SPELL_EFFECTS["342"]).toEqual({ type: "life_points", side: "caster", delta: 5000 });
  });

  it("so alcanca os dois jogadores quando o texto nao nomeia o dono", () => {
    expect(SPELL_EFFECTS["336"]).toMatchObject({ targets: { side: "both" } }); // "every card in play"
    expect(SPELL_EFFECTS["656"]).toMatchObject({ targets: { side: "both" } }); // "all Zombie creatures"
    expect(SPELL_EFFECTS["350"]).toMatchObject({ targets: { side: "both" } }); // "all monsters on the field"
    expect(SPELL_EFFECTS["329"]).toMatchObject({ targets: { side: "opponent" } }); // "all opponent Dragon"
    expect(SPELL_EFFECTS["337"]).toMatchObject({ targets: { side: "opponent" } }); // "every opposing monster"
    expect(SPELL_EFFECTS["320"]).toMatchObject({ targets: { side: "opponent" } }); // "an opponent's monster"
  });

  it("a maldicao conta em levels, com Shadow Spell no dobro de Spellbinding Circle", () => {
    expect(SPELL_EFFECTS["349"]).toMatchObject({ type: "stat_curse", levels: 1 });
    expect(SPELL_EFFECTS["669"]).toMatchObject({ type: "stat_curse", levels: 2 });
    expect(SPELL_EFFECTS["655"]).toEqual({ type: "cleanse_curses", side: "both" });
  });

  it("348 revela e trava, nessa ordem", () => {
    expect(SPELL_EFFECTS["348"]).toEqual({
      type: "sequence",
      effects: [
        { type: "reveal_face_down", targets: { side: "opponent", filter: { kind: "any" } } },
        { type: "attack_lock", side: "opponent", turns: 3 },
      ],
    });
  });

  it("661 destroi por ATK a partir de 1500", () => {
    expect(SPELL_EFFECTS["661"]).toEqual({
      type: "destroy_by_atk",
      targets: { side: "opponent", filter: { kind: "any" } },
      minAtk: 1500,
    });
  });
});

describe("requiresSpellTarget", () => {
  it("so 320 Stop Defense pede alvo", () => {
    const targeted = Object.entries(SPELL_EFFECTS)
      .filter(([, effect]) => requiresSpellTarget(effect))
      .map(([numero]) => numero);

    expect(targeted).toEqual(["320"]);
  });

  it("nenhuma sequence esconde um efeito que pediria alvo", () => {
    // Um efeito alvejavel dentro de uma sequence nao teria como perguntar:
    // `activateSpell` le o alvo do topo do efeito, nao de dentro dele.
    for (const [numero, effect] of Object.entries(SPELL_EFFECTS)) {
      if (effect.type !== "sequence") continue;
      for (const inner of effect.effects) {
        expect({ numero, targeted: requiresSpellTarget(inner) }).toEqual({ numero, targeted: false });
      }
    }
  });
});

describe("getSpellEffect", () => {
  it("devolve o efeito de uma carta da tabela", () => {
    expect(getSpellEffect("337")).toEqual({
      type: "destroy_monsters",
      targets: { side: "opponent", filter: { kind: "any" } },
    });
  });

  it("devolve undefined para uma carta fora da tabela", () => {
    expect(getSpellEffect("001")).toBeUndefined();
    expect(getSpellEffect("722")).toBeUndefined();
  });

  it("nao devolve nada para chaves de prototipo como __proto__, valueOf e toString", () => {
    expect(getSpellEffect("__proto__")).toBeUndefined();
    expect(getSpellEffect("valueOf")).toBeUndefined();
    expect(getSpellEffect("toString")).toBeUndefined();
    expect(getSpellEffect("constructor")).toBeUndefined();
  });
});

describe("spellPlayMode", () => {
  it("classifica equipamento, terreno, efeito imediato e posicionamento inerte", () => {
    expect(spellPlayMode(makeCard({ numero: "301", tipo: "equipamento" }))).toBe("equip");
    expect(spellPlayMode(makeCard({ numero: "334" }))).toBe("terrain");
    expect(spellPlayMode(makeCard({ numero: "337" }))).toBe("one_shot");
    expect(spellPlayMode(makeCard({ numero: "030" }))).toBe("place");
  });

  it("classifica uma sequence como efeito imediato", () => {
    expect(spellPlayMode(makeCard({ numero: "348" }))).toBe("one_shot");
  });

  it("classifica uma armadilha sem entrada na tabela como posicionamento inerte", () => {
    expect(spellPlayMode(makeCard({ numero: "700", tipo: "armadilha", classe: "Trap" }))).toBe(
      "place",
    );
  });

  it("classifica um ritual sem entrada na tabela como posicionamento inerte", () => {
    expect(spellPlayMode(makeCard({ numero: "665", tipo: "ritual", classe: "Ritual" }))).toBe(
      "place",
    );
  });
});

describe("matchesClassFilter", () => {
  it("o filtro any aceita qualquer carta", () => {
    expect(matchesClassFilter(makeCard({ classe: "Dragon" }), { kind: "any" })).toBe(true);
  });

  it("o filtro de classe aceita so a classe exata", () => {
    const filter = { kind: "classe", classe: "Warrior" } as const;
    expect(matchesClassFilter(makeCard({ classe: "Warrior" }), filter)).toBe(true);
    expect(matchesClassFilter(makeCard({ classe: "Beast-Warrior" }), filter)).toBe(false);
    expect(matchesClassFilter(makeCard({ classe: "Dragon" }), filter)).toBe(false);
  });
});
