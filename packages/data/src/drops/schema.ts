import { CardNumberSchema } from "@yugioh/shared";
import { z } from "zod";

import type { DropEntry, DropPool } from "./types.ts";

/**
 * Strict on purpose, same rule as `CardSchema` and `TerrainClassRuleSchema`:
 * an extra field is an authoring error, not data to carry along silently.
 */
export const DropEntrySchema = z.strictObject({
  numero: CardNumberSchema,
  probabilidade: z.number().finite().positive(),
  condicao: z.string().min(1).optional(),
});

export const DropPoolSchema = z.strictObject({
  duelista: z.string().trim().min(1),
  entradas: z.array(DropEntrySchema).min(1),
});

/** The exact shape of `drop-tables.json` — `[]` is a valid instance (spec F08, Decision 3/7). */
export const DropTableFileSchema = z.array(DropPoolSchema);

/** Locks the schema and the declared type together, same guard `CardSchema` uses. */
const _entrySchemaMatchesDeclaredType: DropEntry = {} as z.infer<typeof DropEntrySchema>;
void _entrySchemaMatchesDeclaredType;
const _poolSchemaMatchesDeclaredType: DropPool = {} as z.infer<typeof DropPoolSchema>;
void _poolSchemaMatchesDeclaredType;
