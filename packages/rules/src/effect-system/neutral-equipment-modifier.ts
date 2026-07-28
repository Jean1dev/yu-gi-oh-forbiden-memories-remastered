import type { EquipmentModifierProvider } from "@yugioh/shared";

/**
 * Placeholder implementation of {@link EquipmentModifierProvider}: concrete
 * equipment resolution belongs to the Effect System (cross-PRD, no PRD
 * yet). Always returns no modifier so `calculateEffectiveAtkDef` never
 * breaks while that engine is pending (motor-duelo-1x1/F04, Decision 5).
 */
export const neutralEquipmentModifier: EquipmentModifierProvider = () => ({ atk: 0, def: 0 });
