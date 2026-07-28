import { describe, expect, it } from "vitest";

import type { Card } from "../card/types.ts";
import { LP_INICIAL } from "./constantes.ts";
import { EstadoDueloSchema } from "./schema.ts";
import type { CampoJogador, EstadoDuelo, EstadoJogador, PosicaoMonstro } from "./tipos.ts";

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

function campoVazio(): CampoJogador {
  return {
    monstros: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
    magias: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
  };
}

function jogadorValido(overrides: Partial<EstadoJogador> = {}): EstadoJogador {
  return {
    lp: LP_INICIAL,
    mao: [],
    deck: [],
    campo: campoVazio(),
    ...overrides,
  };
}

function estadoValido(overrides: Partial<EstadoDuelo> = {}): EstadoDuelo {
  return {
    jogadores: { P1: jogadorValido(), P2: jogadorValido() },
    terrenoAtivo: null,
    jogadorAtivo: "P1",
    turno: 1,
    fase: "principal",
    ...overrides,
  };
}

/** Estado valido com o campo de P1 substituido por uma forma qualquer, para testar violacoes de invariante. */
function estadoComCampoP1(campo: unknown) {
  const estado = estadoValido();
  return {
    ...estado,
    jogadores: {
      ...estado.jogadores,
      P1: { ...estado.jogadores.P1, campo },
    },
  };
}

describe("EstadoDueloSchema", () => {
  it("aceita um estado inicial com todas as zonas vazias e LP 8000", () => {
    expect(EstadoDueloSchema.safeParse(estadoValido()).success).toBe(true);
  });

  const posicoes: readonly PosicaoMonstro[] = [
    "ataque_face_cima",
    "ataque_face_baixo",
    "defesa_face_cima",
    "defesa_face_baixo",
  ];

  for (const posicao of posicoes) {
    it(`aceita uma zona de monstro ocupada na posicao ${posicao}`, () => {
      const estado = estadoComCampoP1({
        monstros: [
          { ocupada: true, carta: cartaValida(), posicao, jaAtacou: false, jaMudouDePosicao: false },
          zonaVazia,
          zonaVazia,
          zonaVazia,
          zonaVazia,
        ],
        magias: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
      });
      expect(EstadoDueloSchema.safeParse(estado).success).toBe(true);
    });
  }

  it("rejeita campo monstros com 4 zonas", () => {
    const estado = estadoComCampoP1({
      monstros: [zonaVazia, zonaVazia, zonaVazia, zonaVazia],
      magias: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
    });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
  });

  it("rejeita campo monstros com 6 zonas", () => {
    const estado = estadoComCampoP1({
      monstros: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
      magias: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
    });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
  });

  for (const total of [4, 6]) {
    it(`rejeita campo magias com ${String(total)} zonas`, () => {
      const estado = estadoComCampoP1({
        monstros: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
        magias: Array.from({ length: total }, () => zonaVazia),
      });
      expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
    });
  }

  it("rejeita zona de monstro ocupada sem o campo carta", () => {
    const estado = estadoComCampoP1({
      monstros: [
        { ocupada: true, posicao: "ataque_face_cima", jaAtacou: false, jaMudouDePosicao: false },
        zonaVazia,
        zonaVazia,
        zonaVazia,
        zonaVazia,
      ],
      magias: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
    });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
  });

  it("rejeita zona de monstro vazia com jaAtacou presente", () => {
    const estado = estadoComCampoP1({
      monstros: [{ ocupada: false, jaAtacou: false }, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
      magias: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
    });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
  });

  it("rejeita zona de magia ocupada sem viradaParaCima", () => {
    const estado = estadoComCampoP1({
      monstros: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
      magias: [{ ocupada: true, carta: cartaValida() }, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
    });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
  });

  it("aceita zona de magia ocupada com viradaParaCima false (armadilha setada)", () => {
    const estado = estadoComCampoP1({
      monstros: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
      magias: [
        { ocupada: true, carta: cartaValida({ tipo: "armadilha" }), viradaParaCima: false },
        zonaVazia,
        zonaVazia,
        zonaVazia,
        zonaVazia,
      ],
    });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(true);
  });

  it("aceita zona de magia ocupada com viradaParaCima true (equipamento revelado)", () => {
    const estado = estadoComCampoP1({
      monstros: [zonaVazia, zonaVazia, zonaVazia, zonaVazia, zonaVazia],
      magias: [
        { ocupada: true, carta: cartaValida({ tipo: "equipamento" }), viradaParaCima: true },
        zonaVazia,
        zonaVazia,
        zonaVazia,
        zonaVazia,
      ],
    });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(true);
  });

  it("rejeita lp negativo", () => {
    const estado = estadoValido({ jogadores: { P1: jogadorValido({ lp: -1 }), P2: jogadorValido() } });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
  });

  it("aceita lp zero", () => {
    const estado = estadoValido({ jogadores: { P1: jogadorValido({ lp: 0 }), P2: jogadorValido() } });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(true);
  });

  it("rejeita turno menor que 1", () => {
    expect(EstadoDueloSchema.safeParse(estadoValido({ turno: 0 })).success).toBe(false);
  });

  it("aceita terrenoAtivo nulo", () => {
    expect(EstadoDueloSchema.safeParse(estadoValido({ terrenoAtivo: null })).success).toBe(true);
  });

  it("aceita terrenoAtivo com uma carta qualquer do schema canonico", () => {
    const estado = estadoValido({ terrenoAtivo: cartaValida({ numero: "134", tipo: "magica" }) });
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(true);
  });

  it("rejeita jogadorAtivo fora de P1 ou P2", () => {
    const estado = { ...estadoValido(), jogadorAtivo: "P3" };
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
  });

  it("rejeita fase fora das quatro conhecidas", () => {
    const estado = { ...estadoValido(), fase: "extra" };
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
  });

  it("rejeita carta em mao que viola o schema canonico de 12 campos", () => {
    const estado = estadoValido();
    const cartaInvalida = { ...cartaValida(), tipo: "feitico" };
    const estadoInvalido = {
      ...estado,
      jogadores: { ...estado.jogadores, P1: { ...estado.jogadores.P1, mao: [cartaInvalida] } },
    };
    expect(EstadoDueloSchema.safeParse(estadoInvalido).success).toBe(false);
  });

  it("rejeita objeto com campo desconhecido no nivel raiz", () => {
    const estado = { ...estadoValido(), extra: "campo desconhecido" };
    expect(EstadoDueloSchema.safeParse(estado).success).toBe(false);
  });
});
