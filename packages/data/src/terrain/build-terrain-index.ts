import type { TerrainClassRule } from "./types.ts";

/** Indexes already-validated entries by `terreno`, one per key (duplicates rejected upstream). */
export function buildTerrainIndex(
  entries: readonly TerrainClassRule[],
): ReadonlyMap<string, TerrainClassRule> {
  return new Map(entries.map((entry) => [entry.terreno, entry]));
}
