import { z } from "zod";

import type { TerrainClassRule } from "./types.ts";

function hasNoDuplicates(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

const classListSchema = z
  .array(z.string().trim().min(1))
  .refine(hasNoDuplicates, { message: "class list contains a duplicate entry" });

/**
 * Strict on purpose, same rule as `CardSchema` and `GuardianMatrixEntrySchema`:
 * an extra field is an authoring error, not data to carry along silently.
 *
 * The cross-field rule — a class cannot be both strengthened and weakened in
 * the same entry (spec F07, Decision 5) — is *not* enforced here: zod
 * validates shape only, `detectContradictoryClass` layers that rule on top,
 * the same split F06 uses between `GuardianMatrixEntrySchema` and its
 * resultado/bonusAtaque coherence check.
 */
export const TerrainClassRuleSchema = z.strictObject({
  terreno: z.string().trim().min(1),
  classesFortalecidas: classListSchema,
  classesEnfraquecidas: classListSchema,
  magnitudeFortalecimento: z.number().int().min(0),
  magnitudeEnfraquecimento: z.number().int().min(0),
});

/** The exact shape of `terrain-class-matrix.json` — `[]` is valid. */
export const TerrainClassMatrixSourceSchema = z.array(TerrainClassRuleSchema);

/** Locks the schema and the declared type together, same guard `CardSchema` uses. */
const _schemaMatchesDeclaredType: TerrainClassRule = {} as z.infer<typeof TerrainClassRuleSchema>;
void _schemaMatchesDeclaredType;
