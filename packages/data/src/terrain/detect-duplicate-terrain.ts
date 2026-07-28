import type { TerrainClassRule, TerrainClassViolation } from "./types.ts";

/**
 * Flags a second (or later) entry that repeats a `terreno` already seen.
 * `terreno` is exact-string identity, no case/accent normalization (spec F07,
 * §3 Regras de negócio) — the same rule F01/F02 apply to `numero`.
 */
export function detectDuplicateTerrain(
  entries: readonly TerrainClassRule[],
): readonly TerrainClassViolation[] {
  const seen = new Set<string>();
  const violations: TerrainClassViolation[] = [];

  for (const entry of entries) {
    if (seen.has(entry.terreno)) {
      violations.push({
        category: "terreno_duplicado",
        terreno: entry.terreno,
        code: "duplicate_terreno",
        message: `Terreno '${entry.terreno}' duplicated in the matrix.`,
      });
      continue;
    }
    seen.add(entry.terreno);
  }

  return violations;
}
