import { describe, expect, it } from "vitest";

import type { Card } from "../../card/types.ts";
import { matchesClassFilter } from "./class-filter.ts";
import { spellPlayMode } from "./play-mode.ts";
import { SpellEffectSchema } from "./schema.ts";
import { SPELL_EFFECTS, getSpellEffect } from "./table.ts";

/** The 25 cards specified in `docs/spells/`, in the order the source list gives them. */
const SPECIFIED_CARDS = [
  "301",
  "302",
  "303",
  "304",
  "305",
  "306",
  "307",
  "308",
  "311",
  "314",
  "315",
  "320",
  "329",
  "330",
  "331",
  "332",
  "333",
  "334",
  "335",
  "336",
  "337",
  "342",
  "348",
  "657",
  "672",
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
  it("a tabela cobre exatamente as 25 cartas especificadas", () => {
    expect(Object.keys(SPELL_EFFECTS).sort()).toEqual([...SPECIFIED_CARDS].sort());
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

  it("as dez cartas de equipamento carregam o buff e a restricao de classe corretos", () => {
    expect(SPELL_EFFECTS["301"]).toEqual({
      type: "equip_buff",
      atk: 500,
      def: 500,
      requires: { kind: "classe", classe: "Warrior" },
    });
    expect(SPELL_EFFECTS["304"]).toEqual({
      type: "equip_buff",
      atk: 1000,
      def: 1000,
      requires: { kind: "any" },
    });
    expect(SPELL_EFFECTS["305"]).toEqual({
      type: "equip_buff",
      atk: 0,
      def: 500,
      requires: { kind: "any" },
    });
    expect(SPELL_EFFECTS["657"]).toEqual({
      type: "equip_buff",
      atk: 1000,
      def: 0,
      requires: { kind: "any" },
    });
  });

  it("Dark Energy aponta para Fiend e Elf's Light para Spellcaster, ja que o dataset nao tem atributo", () => {
    expect(SPELL_EFFECTS["303"]).toMatchObject({
      requires: { kind: "classe", classe: "Fiend" },
    });
    expect(SPELL_EFFECTS["307"]).toMatchObject({
      requires: { kind: "classe", classe: "Spellcaster" },
    });
  });

  it("os efeitos sem dono explicito alcancam os dois jogadores", () => {
    expect(SPELL_EFFECTS["320"]).toMatchObject({ targets: { side: "both" } });
    expect(SPELL_EFFECTS["329"]).toMatchObject({ targets: { side: "both" } });
    expect(SPELL_EFFECTS["336"]).toMatchObject({ targets: { side: "both" } });
    expect(SPELL_EFFECTS["302"]).toMatchObject({ targets: { side: "opponent" } });
    expect(SPELL_EFFECTS["337"]).toMatchObject({ targets: { side: "opponent" } });
  });

  it("306 tira e 342 devolve life points, com o sinal em delta", () => {
    expect(SPELL_EFFECTS["306"]).toEqual({ type: "life_points", side: "opponent", delta: -500 });
    expect(SPELL_EFFECTS["342"]).toEqual({ type: "life_points", side: "caster", delta: 1000 });
  });

  it("348 trava o oponente por tres turnos", () => {
    expect(SPELL_EFFECTS["348"]).toEqual({ type: "attack_lock", side: "opponent", turns: 3 });
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

  it("classifica 302 e 306 como efeito imediato apesar de serem tipo equipamento", () => {
    expect(spellPlayMode(makeCard({ numero: "302", tipo: "equipamento" }))).toBe("one_shot");
    expect(spellPlayMode(makeCard({ numero: "306", tipo: "equipamento" }))).toBe("one_shot");
  });

  it("classifica uma armadilha sem entrada na tabela como posicionamento inerte", () => {
    expect(spellPlayMode(makeCard({ numero: "700", tipo: "armadilha", classe: "Trap" }))).toBe(
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
