import type {
  Card,
  EffectiveAtkDef,
  EquipmentModifierProvider,
  GuardianModifierProvider,
  TerrainModifierProvider,
} from "@yugioh/shared";

/**
 * The relational/state context a modifier calculation needs, read from
 * `DuelState` by the caller (this function never reads state on its own).
 * `opponent` is optional and absent — not `null` — when there is no combat
 * in progress (e.g. UI/AI previewing an isolated monster's power); the
 * function then hands `null` to the Guardian provider itself (spec Decision 2).
 */
export type CombatContext = Readonly<{
  activeField: Card | null;
  opponent?: Card | null;
}>;

/** The three modifier ports, injected rather than imported (spec Decision 9). */
export type ModifierProviders = Readonly<{
  guardian: GuardianModifierProvider;
  terrain: TerrainModifierProvider;
  equipment: EquipmentModifierProvider;
}>;

/**
 * Composes a monster's effective ATK/DEF: base (from the card schema) plus
 * the Guardian Star, terrain and equipment deltas, added term by term
 * (motor-duelo-1x1/F04, critério de aceite 1). Pure and total: `null` base
 * `atk`/`def` reads as `0` (spec Decision 6), no result clamp (spec Decision
 * 7 — revisit once real modifier tables exist), and neither `monster`,
 * `context` nor `providers` is ever mutated. Never throws on its own path;
 * if an injected provider throws, that exception propagates unchanged to
 * the caller (F11).
 */
export function calculateEffectiveAtkDef(
  monster: Card,
  context: CombatContext,
  providers: ModifierProviders,
): EffectiveAtkDef {
  const baseAtk = monster.atk ?? 0;
  const baseDef = monster.def ?? 0;

  const guardian = providers.guardian(monster, context.opponent ?? null);
  const terrain = providers.terrain(monster, context.activeField);
  const equipment = providers.equipment(monster);

  return {
    atk: baseAtk + guardian.atk + terrain.atk + equipment.atk,
    def: baseDef + guardian.def + terrain.def + equipment.def,
  };
}
