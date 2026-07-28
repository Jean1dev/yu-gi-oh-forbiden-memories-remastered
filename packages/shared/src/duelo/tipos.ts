import type { Card } from "../card/types.ts";

/** Um dos dois lados do duelo. */
export type JogadorId = "P1" | "P2";

/** A fase corrente do turno. */
export type Fase = "compra" | "principal" | "batalha" | "fim";

/** As quatro combinacoes de ataque/defesa x face-cima/face-baixo. */
export type PosicaoMonstro =
  | "ataque_face_cima"
  | "ataque_face_baixo"
  | "defesa_face_cima"
  | "defesa_face_baixo";

/**
 * Uma zona de monstro do campo. Uniao discriminada por `ocupada`: a variante
 * vazia nunca carrega carta, posicao ou flags de turno; a ocupada sempre
 * carrega todos eles.
 */
export type ZonaMonstro =
  | Readonly<{ ocupada: false }>
  | Readonly<{
      ocupada: true;
      carta: Card;
      posicao: PosicaoMonstro;
      jaAtacou: boolean;
      jaMudouDePosicao: boolean;
    }>;

/**
 * Uma zona de magia/armadilha do campo. Mais simples que `ZonaMonstro`: sem
 * posicao de batalha e sem flags de turno, que nao fazem sentido para essas
 * cartas.
 */
export type ZonaMagia =
  | Readonly<{ ocupada: false }>
  | Readonly<{ ocupada: true; carta: Card; viradaParaCima: boolean }>;

/** As dez zonas do campo de um jogador, com identidade fixa por indice. */
export type CampoJogador = Readonly<{
  monstros: readonly [ZonaMonstro, ZonaMonstro, ZonaMonstro, ZonaMonstro, ZonaMonstro];
  magias: readonly [ZonaMagia, ZonaMagia, ZonaMagia, ZonaMagia, ZonaMagia];
}>;

/** O estado de um jogador: pontos de vida, mao, baralho e campo. */
export type EstadoJogador = Readonly<{
  lp: number;
  mao: readonly Card[];
  /** Ordenado; indice 0 = topo do baralho. */
  deck: readonly Card[];
  campo: CampoJogador;
}>;

/**
 * A fonte unica da verdade do duelo: os dois jogadores mais o estado global
 * (terreno, jogador ativo, turno, fase). 100% dados serializaveis em JSON —
 * nenhuma funcao, classe, `Map` ou `Set` em nenhum campo.
 */
export type EstadoDuelo = Readonly<{
  jogadores: Readonly<Record<JogadorId, EstadoJogador>>;
  /** Unico e global; `null` = nenhum terreno ativo. */
  terrenoAtivo: Card | null;
  jogadorAtivo: JogadorId;
  turno: number;
  fase: Fase;
}>;
