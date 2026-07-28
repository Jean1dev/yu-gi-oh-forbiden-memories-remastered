import { TerrainClassRuleSchema } from "./schema.ts";
import type { TerrainClassRule, TerrainClassViolation } from "./types.ts";

export type MatrixStructureResult = Readonly<{
  /** Only the entries that matched `TerrainClassRuleSchema`. */
  entries: readonly TerrainClassRule[];
  /** One violation per element that did not, in input order. */
  violations: readonly TerrainClassViolation[];
}>;

/**
 * Validates every raw element of the matrix source against
 * `TerrainClassRuleSchema`, in isolation.
 *
 * Never stops at the first bad element (spec F07, §3 step 3, same spirit as
 * F01/F02's `reparseCards`): a malformed entry is reported and left out of
 * the returned `entries`, so the caller can still run the duplicate/
 * contradiction/reference checks over the entries that did parse, and
 * `createTerrainTable` accumulates every violation from every step into one
 * verdict (spec F07, Decision 6).
 */
export function validateMatrixStructure(raw: unknown): MatrixStructureResult {
  if (!Array.isArray(raw)) {
    return {
      entries: [],
      violations: [
        {
          category: "estrutura",
          code: "invalid_matrix_shape",
          message: "Terrain class matrix source is not a JSON array.",
        },
      ],
    };
  }

  const entries: TerrainClassRule[] = [];
  const violations: TerrainClassViolation[] = [];

  raw.forEach((element: unknown, index) => {
    const parsed = TerrainClassRuleSchema.safeParse(element);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.map(String).join(".")} ${issue.message}`.trim())
        .join("; ");
      violations.push({
        category: "estrutura",
        code: "invalid_terrain_class_rule",
        message: `Entry ${String(index)}: ${details}`,
      });
      return;
    }
    entries.push(Object.freeze(parsed.data));
  });

  return { entries, violations };
}
