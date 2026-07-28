import { DomainError, err, ok, type Result } from "@yugioh/shared";

import { GuardianMatrixEntrySchema } from "./schema.ts";
import type { GuardianMatrixEntry } from "./types.ts";

/** `resultado === "neutro"` iff `bonusAtaque === 0` (spec F06, Decision 4). */
function isCoherent(entry: GuardianMatrixEntry): boolean {
  return entry.resultado === "neutro" ? entry.bonusAtaque === 0 : entry.bonusAtaque > 0;
}

/**
 * Validates one raw entry of the matrix source in isolation: shape first
 * (`GuardianMatrixEntrySchema`), then the resultado<->bonusAtaque coherence
 * rule the schema cannot express.
 *
 * Never partial: an entry either fully validates or is rejected as a whole,
 * so `createGuardianMatrix` can fail the entire build on the first bad entry
 * without a caller needing to inspect a partial result (spec F06, Decision 5).
 */
export function normalizeMatrixEntry(raw: unknown): Result<GuardianMatrixEntry, DomainError> {
  const parsed = GuardianMatrixEntrySchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.map(String).join(".")} ${issue.message}`.trim())
      .join("; ");
    return err(
      new DomainError(
        `Guardian matrix entry does not match the expected schema: ${details}`,
        "invalid_matrix_entry",
        {
          issues: parsed.error.issues,
        },
      ),
    );
  }

  const entry = parsed.data;
  if (!isCoherent(entry)) {
    return err(
      new DomainError(
        `Entry ${entry.atacante}→${entry.defensor}: resultado '${entry.resultado}' is incoherent with bonusAtaque ${String(entry.bonusAtaque)}.`,
        "incoherent_result_bonus",
        {
          atacante: entry.atacante,
          defensor: entry.defensor,
          resultado: entry.resultado,
          bonusAtaque: entry.bonusAtaque,
        },
      ),
    );
  }

  return ok(entry);
}
