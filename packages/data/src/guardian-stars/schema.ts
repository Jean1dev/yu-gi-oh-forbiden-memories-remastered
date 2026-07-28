import { GuardianStarSchema } from "@yugioh/shared";
import { z } from "zod";

import { GUARDIAN_COMPATIBILITY_RESULTS, type GuardianMatrixEntry } from "./types.ts";

export const GuardianCompatibilityResultSchema = z.enum(GUARDIAN_COMPATIBILITY_RESULTS);

/**
 * Strict on purpose, same rule as `CardSchema` (F01): an extra field is an
 * error, so a typo in a hand-authored entry never lands silently.
 *
 * Coherence between `resultado` and `bonusAtaque` (spec F06, Decision 4) is
 * *not* enforced here — zod validates shape only; `normalizeMatrixEntry`
 * layers the cross-field rule on top, the same split F02 uses between
 * `CardSchema` and `checkTypeCoherence`.
 */
export const GuardianMatrixEntrySchema = z.strictObject({
  atacante: GuardianStarSchema,
  defensor: GuardianStarSchema,
  resultado: GuardianCompatibilityResultSchema,
  bonusAtaque: z.number().int().min(0),
});

/** The exact shape of `guardian-star-matrix.source.json` — `[]` is valid. */
export const GuardianMatrixSourceSchema = z.array(GuardianMatrixEntrySchema);

/**
 * Locks the schema and the declared type together, same guard `CardSchema`
 * uses.
 */
const _schemaMatchesDeclaredType: GuardianMatrixEntry = {} as z.infer<
  typeof GuardianMatrixEntrySchema
>;
void _schemaMatchesDeclaredType;
