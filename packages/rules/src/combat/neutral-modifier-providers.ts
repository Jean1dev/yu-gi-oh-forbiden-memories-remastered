import type {
  EquipmentModifierProvider,
  GuardianModifierProvider,
  TerrainModifierProvider,
} from "@yugioh/shared";

import { neutralEquipmentModifier } from "../effect-system/index.ts";
import { neutralGuardianModifier } from "../guardian-star/index.ts";
import { neutralTerrainModifier } from "../terrain/index.ts";

/**
 * Convenience bundle of the three neutral providers, ready to inject into
 * `calculateEffectiveAtkDef` in rules-only callers. The duel engine composes
 * the equipment slot with attached zone context; guardian and terrain remain
 * neutral until their canonical tables exist.
 */
export const neutralModifierProviders: Readonly<{
  guardian: GuardianModifierProvider;
  terrain: TerrainModifierProvider;
  equipment: EquipmentModifierProvider;
}> = {
  guardian: neutralGuardianModifier,
  terrain: neutralTerrainModifier,
  equipment: neutralEquipmentModifier,
};
