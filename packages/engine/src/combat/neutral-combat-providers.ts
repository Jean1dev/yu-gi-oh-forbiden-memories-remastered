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
 *
 * The **equipment** slot is no longer neutral in combat: `resolveAttack` now
 * composes this bundle through `equipCombatProviders`
 * (`packages/engine/src/spells/effects/equip-bonus.ts`), which closes over the
 * zone's attached equips at construction time — the answer to the pendency
 * this comment used to describe, and the reason it needs no extra parameter.
 * Guardian and terrain stay neutral until their tables in `packages/data`
 * exist (`docs/arquitetura.md` §4.3).
 */
export const neutralCombatProviders: ModifierProviders = {
  guardian: () => ({ atk: 0, def: 0 }),
  terrain: () => ({ atk: 0, def: 0 }),
  equipment: () => ({ atk: 0, def: 0 }),
};
