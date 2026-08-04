import type { Card } from "../card/types.ts";

/**
 * ATK/DEF as a pair of independent deltas or as a final effective value —
 * the same shape serves both (motor-duelo-1x1/F04, Decision 3). A Guardian
 * Star bonus described by `product.md` as "attack only" still fits: it is
 * simply `{ atk: N, def: 0 }`.
 */
export type EffectiveAtkDef = Readonly<{ atk: number; def: number }>;

/**
 * Port for the Guardian Star compatibility bonus (cross-PRD, GuardianStar
 * Engine, no PRD yet). Receives both full cards — not just their Guardian
 * Stars — because the real table may need more of the monster's shape than
 * `guardiao1`/`guardiao2` alone (e.g. `classe`). `opponent` is `null` when
 * there is no relational adversary yet (e.g. UI previewing an isolated
 * monster's power); the provider decides what that means for its own delta.
 * Until GuardianStar Engine exists, every implementation of this port
 * returns `{ atk: 0, def: 0 }` (`packages/rules/src/guardian-star`).
 */
export type GuardianModifierProvider = (monster: Card, opponent: Card | null) => EffectiveAtkDef;

/**
 * Port for the terrain bonus/penalty by monster class (cross-PRD, Terrain
 * Engine, no PRD yet). `activeField` is `DuelState.activeField` as read by
 * the caller — this port never reads state on its own. Until Terrain Engine
 * exists, every implementation of this port returns `{ atk: 0, def: 0 }`
 * (`packages/rules/src/terrain`).
 */
export type TerrainModifierProvider = (monster: Card, activeField: Card | null) => EffectiveAtkDef;

/**
 * Port for the accumulated equipment bonus on a monster (cross-PRD, Effect
 * System, no PRD yet). Takes only the monster's `Card` (spec Decision 4) —
 * not the full `DuelState` nor a zone reference: whoever builds the real
 * implementation closes over whatever additional context it needs (state,
 * zone) at the point where the function is constructed, not in this
 * signature. The engine's combat adapter now closes over
 * `MonsterZone.equips`; the rules-only implementation remains neutral because
 * it has no zone context (`packages/rules/src/effect-system`).
 */
export type EquipmentModifierProvider = (monster: Card) => EffectiveAtkDef;
