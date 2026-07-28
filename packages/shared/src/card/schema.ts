import { z } from "zod";

import { CARD_NUMBER_LENGTH, CARD_TYPES, GUARDIAN_STARS } from "./constants.ts";
import type { Card } from "./types.ts";

const CARD_NUMBER_PATTERN = new RegExp(`^[0-9]{${String(CARD_NUMBER_LENGTH)}}$`);

/** Four groups of two digits, exactly as printed on the cards: `89 63 11 39`. */
const PASSWORD_PATTERN = /^\d{2} \d{2} \d{2} \d{2}$/;

export const CardNumberSchema = z
  .string()
  .regex(CARD_NUMBER_PATTERN, "numero must be exactly 3 digits");

export const CardTypeSchema = z.enum(CARD_TYPES);

export const GuardianStarSchema = z.enum(GUARDIAN_STARS);

const nullableInteger = z.number().int().min(0).nullable();

/**
 * Canonical contract of a normalized card. Strict on purpose: an extra field is
 * an error, so leftovers from the source envelope can never leak into the
 * dataset.
 */
export const CardSchema = z.strictObject({
  id: z.number().int().min(1),
  numero: CardNumberSchema,
  nome: z.string().min(1),
  img: z.null(),
  classe: z.string().min(1),
  atk: nullableInteger,
  def: nullableInteger,
  guardiao1: GuardianStarSchema.nullable(),
  guardiao2: GuardianStarSchema.nullable(),
  password: z.string().regex(PASSWORD_PATTERN).nullable(),
  estrelas: nullableInteger,
  tipo: CardTypeSchema,
});

/**
 * Locks the schema and the declared type together: if one changes without the
 * other, the typecheck breaks here instead of silently drifting.
 */
const _schemaMatchesDeclaredType: Card = {} as z.infer<typeof CardSchema>;
void _schemaMatchesDeclaredType;
