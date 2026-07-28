import { DomainError, err, ok, type Result } from "@yugioh/shared";

import { normalizeMatrixEntry } from "./normalize-entry.ts";
import type { GuardianMatrix, GuardianMatrixEntry } from "./types.ts";

function pairKey(atacante: string, defensor: string): string {
  return `${atacante}:${defensor}`;
}

/**
 * Builds the indexed, immutable matrix from the raw array parsed out of
 * `guardian-star-matrix.source.json`.
 *
 * Reparse tudo-ou-nada (spec F06, Decision 5): the first entry that fails
 * `normalizeMatrixEntry`, or the first duplicated `(atacante, defensor)` pair,
 * aborts the whole build with a single `DomainError` — there is no "partially
 * valid matrix" the way F01/F02 tolerate partial datasets, because this data
 * is hand-authored by the maintainer, not machine-ingested from an uncontrolled
 * source.
 */
export function createGuardianMatrix(rawEntries: unknown): Result<GuardianMatrix, DomainError> {
  if (!Array.isArray(rawEntries)) {
    return err(
      new DomainError("Guardian Star matrix source is not a JSON array.", "invalid_matrix_entry", {
        rawEntries,
      }),
    );
  }

  const entries: GuardianMatrixEntry[] = [];
  const firstIndexByPair = new Map<string, number>();

  for (let index = 0; index < rawEntries.length; index += 1) {
    const parsed = normalizeMatrixEntry(rawEntries[index]);
    if (!parsed.ok) {
      return err(
        new DomainError(`Entry ${String(index)}: ${parsed.error.message}`, parsed.error.code, {
          index,
          ...parsed.error.details,
        }),
      );
    }

    const key = pairKey(parsed.value.atacante, parsed.value.defensor);
    const firstIndex = firstIndexByPair.get(key);
    if (firstIndex !== undefined) {
      return err(
        new DomainError(
          `Duplicate pair: ${parsed.value.atacante}→${parsed.value.defensor} appears in entries ${String(firstIndex)} and ${String(index)}.`,
          "duplicate_guardian_pair",
          {
            atacante: parsed.value.atacante,
            defensor: parsed.value.defensor,
            firstIndex,
            secondIndex: index,
          },
        ),
      );
    }

    firstIndexByPair.set(key, index);
    entries.push(Object.freeze(parsed.value));
  }

  const byPair = new Map<string, GuardianMatrixEntry>();
  for (const entry of entries) {
    byPair.set(pairKey(entry.atacante, entry.defensor), entry);
  }

  const frozenEntries: readonly GuardianMatrixEntry[] = Object.freeze(entries);

  const matrix: GuardianMatrix = {
    queryCompatibility(atacante, defensor) {
      return (
        byPair.get(pairKey(atacante, defensor)) ??
        Object.freeze({ atacante, defensor, resultado: "neutro" as const, bonusAtaque: 0 })
      );
    },
    listEntries() {
      return frozenEntries;
    },
    size() {
      return entries.length;
    },
  };

  return ok(Object.freeze(matrix));
}
