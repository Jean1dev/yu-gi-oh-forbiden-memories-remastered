import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Card } from "../card/types.ts";
import { CampoJogadorSchema, ZonaMonstroSchema } from "./schema.ts";
import type { PosicaoMonstro } from "./tipos.ts";

const zonaVazia = { ocupada: false } as const;

function cartaValida(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: "89 63 11 39",
    estrelas: 999999,
    tipo: "monstro",
    ...overrides,
  };
}

const posicoes: readonly PosicaoMonstro[] = [
  "ataque_face_cima",
  "ataque_face_baixo",
  "defesa_face_cima",
  "defesa_face_baixo",
];

describe("CampoJogadorSchema invariante de exatamente 5 zonas", () => {
  it("aceita monstros apenas quando ha exatamente 5 zonas, para qualquer n em [0, 10]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (n) => {
        const campo = {
          monstros: Array.from({ length: n }, () => zonaVazia),
          magias: Array.from({ length: 5 }, () => zonaVazia),
        };
        expect(CampoJogadorSchema.safeParse(campo).success).toBe(n === 5);
      }),
      { numRuns: 1000 },
    );
  });

  it("aceita magias apenas quando ha exatamente 5 zonas, para qualquer n em [0, 10]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (n) => {
        const campo = {
          monstros: Array.from({ length: 5 }, () => zonaVazia),
          magias: Array.from({ length: n }, () => zonaVazia),
        };
        expect(CampoJogadorSchema.safeParse(campo).success).toBe(n === 5);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("ZonaMonstroSchema aceitacao de carta canonica valida", () => {
  it("qualquer carta canonica valida em qualquer das 4 posicoes sempre passa", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999999 }),
        fc.integer({ min: 0, max: 999999 }),
        fc.integer({ min: 0, max: 999999 }),
        fc.constantFrom(...posicoes),
        fc.boolean(),
        fc.boolean(),
        (id, atk, def, posicao, jaAtacou, jaMudouDePosicao) => {
          const zona = {
            ocupada: true,
            carta: cartaValida({ id, atk, def }),
            posicao,
            jaAtacou,
            jaMudouDePosicao,
          };
          expect(ZonaMonstroSchema.safeParse(zona).success).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("ZonaMonstroSchema preservacao do valor base", () => {
  it("atk e def lidos de volta da zona sao sempre identicos ao valor original", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999999 }),
        fc.integer({ min: 0, max: 999999 }),
        fc.constantFrom(...posicoes),
        (atk, def, posicao) => {
          const zona = {
            ocupada: true,
            carta: cartaValida({ atk, def }),
            posicao,
            jaAtacou: false,
            jaMudouDePosicao: false,
          };
          const resultado = ZonaMonstroSchema.parse(zona);
          if (!resultado.ocupada) throw new Error("esperava uma zona ocupada");

          expect(resultado.carta.atk).toBe(atk);
          expect(resultado.carta.def).toBe(def);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
