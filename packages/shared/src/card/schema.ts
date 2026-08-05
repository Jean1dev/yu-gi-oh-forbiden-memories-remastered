import { z } from "zod";

import {
  CARD_ATTRIBUTES,
  CARD_NUMBER_LENGTH,
  CARD_TYPES,
  GUARDIAN_STARS,
  MAX_MONSTER_LEVEL,
  MIN_MONSTER_LEVEL,
} from "./constants.ts";
import type { Card } from "./types.ts";

const CARD_NUMBER_PATTERN = new RegExp(`^[0-9]{${String(CARD_NUMBER_LENGTH)}}$`);

/** Four groups of two digits, exactly as printed on the cards: `89 63 11 39`. */
const PASSWORD_PATTERN = /^\d{2} \d{2} \d{2} \d{2}$/;

export const CardNumberSchema = z
  .string()
  .regex(CARD_NUMBER_PATTERN, "numero must be exactly 3 digits");

/**
 * The typeable password of a card, on its own.
 *
 * Exported because the shape is asserted in two places — when a card is parsed,
 * and when the catalog decides whether a string a player typed is worth looking
 * up at all (banco-de-cartas/F03). One definition keeps the two from drifting.
 */
export const CardPasswordSchema = z.string().regex(PASSWORD_PATTERN);

export const CardTypeSchema = z.enum(CARD_TYPES);

export const GuardianStarSchema = z.enum(GUARDIAN_STARS);

export const AttributeSchema = z.enum(CARD_ATTRIBUTES);

const nullableInteger = z.number().int().min(0).nullable();

const nullableMonsterLevel = z
  .number()
  .int()
  .min(MIN_MONSTER_LEVEL)
  .max(MAX_MONSTER_LEVEL)
  .nullable()
  .default(null);

/**
 * Canonical contract of a normalized card. Strict on purpose: an extra field is
 * an error, so leftovers from the source envelope can never leak into the
 * dataset.
 *
 * `atributo`/`nivel`/`descricao` are `null` until `renderizacao-cartas/F02`
 * enriches the card (spec F01, Decision 1) — most of the catalog stays `null`
 * until the full rollout (F07).
 */
export const CardSchema = z
  .strictObject({
    id: z.number().int().min(1),
    numero: CardNumberSchema,
    nome: z.string().min(1),
    img: z.null(),
    classe: z.string().min(1),
    atk: nullableInteger,
    def: nullableInteger,
    guardiao1: GuardianStarSchema.nullable(),
    guardiao2: GuardianStarSchema.nullable(),
    password: CardPasswordSchema.nullable(),
    estrelas: nullableInteger,
    tipo: CardTypeSchema,
    atributo: AttributeSchema.nullable().default(null),
    nivel: nullableMonsterLevel,
    descricao: z.string().min(1).nullable().default(null),
  })
  .superRefine((card, ctx) => {
    if (card.nivel !== null && card.tipo !== "monstro") {
      ctx.addIssue({
        code: "custom",
        path: ["nivel"],
        message: "nivel must be null when tipo is not 'monstro'",
      });
    }
  });

/**
 * Locks the schema and the declared type together: if one changes without the
 * other, the typecheck breaks here instead of silently drifting.
 */
const _schemaMatchesDeclaredType: Card = {} as z.infer<typeof CardSchema>;
void _schemaMatchesDeclaredType;
