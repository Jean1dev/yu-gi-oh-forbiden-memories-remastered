import type { ModifierProviders } from "./calculate-effective-atk-def.ts";

/**
 * Neutral `{ atk: 0, def: 0 }` bundle used by `resolveAttack` to call
 * `calculateEffectiveAtkDef` (motor-duelo-1x1 F11 spec Decision 6).
 *
 * Intentional duplication of `packages/rules/src/combat/neutral-modifier-providers.ts`
 * (F04): `packages/engine` never imports `packages/rules` (verified by
 * `.dependency-cruiser.cjs`), and `apply(state, action)` stays a two-parameter
 * function for cross-node determinism (F09 spec Decision 2), so there is no
 * third parameter through which real providers could be injected today.
 * Documented pendency, not a blocker: once GuardianStar/Terrain/Effect System
 * exist, something will need to decide how non-neutral providers reach
 * combat resolution without `engine` importing `rules`.
 */
export const neutralCombatProviders: ModifierProviders = {
  guardian: () => ({ atk: 0, def: 0 }),
  terrain: () => ({ atk: 0, def: 0 }),
  equipment: () => ({ atk: 0, def: 0 }),
};
