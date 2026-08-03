import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Card } from "../../card/types.ts";
import { matchesClassFilter } from "./class-filter.ts";
import { spellPlayMode } from "./play-mode.ts";
import { SpellEffectSchema } from "./schema.ts";
import { SPELL_EFFECTS, getSpellEffect } from "./table.ts";

const tableNumbers = Object.keys(SPELL_EFFECTS);

const cardNumberArbitrary = fc.integer({ min: 1, max: 999 }).map((n) => String(n).padStart(3, "0"));

function makeCard(numero: string, classe = "Warrior"): Card {
  return {
    id: 1,
    numero,
    nome: "Test Card",
    img: null,
    classe,
    atk: null,
    def: null,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "magica",
  };
}

describe("SPELL_EFFECTS properties", () => {
  it("getSpellEffect devolve um efeito valido exatamente para as chaves da tabela", () => {
    fc.assert(
      fc.property(cardNumberArbitrary, (numero) => {
        const effect = getSpellEffect(numero);
        expect(effect === undefined).toBe(!tableNumbers.includes(numero));
        if (effect !== undefined) {
          expect(SpellEffectSchema.safeParse(effect).success).toBe(true);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("getSpellEffect nunca devolve algo herdado do prototipo, para nenhuma string", () => {
    fc.assert(
      fc.property(fc.string(), (key) => {
        const effect = getSpellEffect(key);
        expect(effect === undefined || tableNumbers.includes(key)).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("spellPlayMode devolve place para toda carta fora da tabela", () => {
    fc.assert(
      fc.property(cardNumberArbitrary, (numero) => {
        fc.pre(!tableNumbers.includes(numero));
        expect(spellPlayMode(makeCard(numero))).toBe("place");
      }),
      { numRuns: 1000 },
    );
  });

  it("o filtro any casa com qualquer classe e o filtro de classe so com a propria", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (classe, other) => {
        expect(matchesClassFilter(makeCard("001", classe), { kind: "any" })).toBe(true);
        expect(matchesClassFilter(makeCard("001", classe), { kind: "classe", classe })).toBe(true);
        expect(matchesClassFilter(makeCard("001", classe), { kind: "classe", classe: other })).toBe(
          classe === other,
        );
      }),
      { numRuns: 1000 },
    );
  });

  it("a tabela e imutavel: escrever nela nao altera o efeito consultado", () => {
    const before = getSpellEffect("337");
    expect(() => {
      (SPELL_EFFECTS as Record<string, unknown>)["337"] = { type: "terrain" };
    }).toThrow();
    expect(getSpellEffect("337")).toEqual(before);
  });
});
