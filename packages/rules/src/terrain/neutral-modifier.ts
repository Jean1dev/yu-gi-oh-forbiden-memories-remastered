import type { TerrainModifierProvider } from "@yugioh/shared";

/**
 * Placeholder implementation of {@link TerrainModifierProvider}: the terrain
 * x class matrix (~24 classes, `docs/arquitetura.md` §4.3) does not exist
 * yet (Terrain Engine, cross-PRD, no PRD). Always returns no modifier so
 * `calculateEffectiveAtkDef` never breaks while the real table is pending
 * (motor-duelo-1x1/F04, Decision 5).
 */
export const neutralTerrainModifier: TerrainModifierProvider = () => ({ atk: 0, def: 0 });
