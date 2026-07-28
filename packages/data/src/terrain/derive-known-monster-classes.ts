import type { CardCatalog } from "../catalog/types.ts";

/**
 * Derives the monster classes actually used by the catalog, alphabetically
 * sorted.
 *
 * Filters `listByTipo("monstro")` first rather than reading
 * `catalog.countByClasse()` directly: the canonical `classe` field also
 * carries non-monster labels reused from the source (`Equip`, `Magic`,
 * `Trap`, `Ritual` — spec F01 Decision 8), and cards of `tipo === "ritual"`
 * have no `atk`/`def`/Guardian Stars either, so a terrain bonus would have
 * nothing to apply to. Compatibility only makes sense for `tipo === "monstro"`
 * (spec F07, Decision 3).
 */
export function deriveKnownMonsterClasses(catalog: CardCatalog): readonly string[] {
  const classes = new Set(catalog.listByTipo("monstro").map((card) => card.classe));
  return Object.freeze([...classes].sort());
}
