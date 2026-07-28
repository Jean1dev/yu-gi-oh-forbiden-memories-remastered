import type { GuardianModifierProvider } from "@yugioh/shared";

/**
 * Placeholder implementation of {@link GuardianModifierProvider}: the
 * Guardian Star compatibility matrix (10x10, `docs/arquitetura.md` §4.3)
 * does not exist yet (GuardianStar Engine, cross-PRD, no PRD). Always
 * returns no modifier so `calculateEffectiveAtkDef` never breaks while the
 * real table is pending (motor-duelo-1x1/F04, Decision 5).
 */
export const neutralGuardianModifier: GuardianModifierProvider = () => ({ atk: 0, def: 0 });
