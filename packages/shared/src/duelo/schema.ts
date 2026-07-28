import { z } from "zod";

import { CardSchema } from "../card/schema.ts";
import type { CampoJogador, EstadoDuelo, EstadoJogador, ZonaMagia, ZonaMonstro } from "./tipos.ts";

export const JogadorIdSchema = z.enum(["P1", "P2"]);

export const FaseSchema = z.enum(["compra", "principal", "batalha", "fim"]);

export const PosicaoMonstroSchema = z.enum([
  "ataque_face_cima",
  "ataque_face_baixo",
  "defesa_face_cima",
  "defesa_face_baixo",
]);

export const ZonaMonstroSchema = z.discriminatedUnion("ocupada", [
  z.strictObject({ ocupada: z.literal(false) }),
  z.strictObject({
    ocupada: z.literal(true),
    carta: CardSchema,
    posicao: PosicaoMonstroSchema,
    jaAtacou: z.boolean(),
    jaMudouDePosicao: z.boolean(),
  }),
]);

export const ZonaMagiaSchema = z.discriminatedUnion("ocupada", [
  z.strictObject({ ocupada: z.literal(false) }),
  z.strictObject({
    ocupada: z.literal(true),
    carta: CardSchema,
    viradaParaCima: z.boolean(),
  }),
]);

export const CampoJogadorSchema = z.strictObject({
  monstros: z.tuple([
    ZonaMonstroSchema,
    ZonaMonstroSchema,
    ZonaMonstroSchema,
    ZonaMonstroSchema,
    ZonaMonstroSchema,
  ]),
  magias: z.tuple([
    ZonaMagiaSchema,
    ZonaMagiaSchema,
    ZonaMagiaSchema,
    ZonaMagiaSchema,
    ZonaMagiaSchema,
  ]),
});

export const EstadoJogadorSchema = z.strictObject({
  lp: z.number().int().min(0),
  mao: z.array(CardSchema),
  deck: z.array(CardSchema),
  campo: CampoJogadorSchema,
});

export const EstadoDueloSchema = z.strictObject({
  jogadores: z.strictObject({
    P1: EstadoJogadorSchema,
    P2: EstadoJogadorSchema,
  }),
  terrenoAtivo: CardSchema.nullable(),
  jogadorAtivo: JogadorIdSchema,
  turno: z.number().int().min(1),
  fase: FaseSchema,
});

/**
 * Trava o schema e o tipo declarado juntos: se um mudar sem o outro, o
 * typecheck quebra aqui em vez de divergir silenciosamente (mesmo padrao de
 * `CardSchema`/`Card` em `packages/shared/src/card`).
 */
const _schemaMatchesDeclaredType: EstadoDuelo = {} as z.infer<typeof EstadoDueloSchema>;
void _schemaMatchesDeclaredType;
const _campoMatchesDeclaredType: CampoJogador = {} as z.infer<typeof CampoJogadorSchema>;
void _campoMatchesDeclaredType;
const _jogadorMatchesDeclaredType: EstadoJogador = {} as z.infer<typeof EstadoJogadorSchema>;
void _jogadorMatchesDeclaredType;
const _zonaMonstroMatchesDeclaredType: ZonaMonstro = {} as z.infer<typeof ZonaMonstroSchema>;
void _zonaMonstroMatchesDeclaredType;
const _zonaMagiaMatchesDeclaredType: ZonaMagia = {} as z.infer<typeof ZonaMagiaSchema>;
void _zonaMagiaMatchesDeclaredType;
