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
 * `calculateEffectiveAtkDef` before GuardianStar Engine, Terrain Engine and
 * Effect System exist (motor-duelo-1x1/F04, Decision 8).
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
