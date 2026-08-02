import type { EffectiveAtkDef } from "@yugioh/shared";

/**
 * Input to the pure FM combat table (motor-duelo-1x1 F11 spec Decision 10):
 * only the numbers involved, never `DuelState`, so every branch is testable
 * without assembling a full state.
 */
export type ResolveCombatTableInput = Readonly<{
  attackerEffective: EffectiveAtkDef;
  /** `undefined` = direct attack (no defender). */
  defenderEffective: EffectiveAtkDef | undefined;
  /** `undefined` = direct attack; otherwise the defender's posture at resolution time. */
  defenderPosition: "attack" | "defense" | undefined;
}>;

export type ResolveCombatTableResult = Readonly<{
  attackerDestroyed: boolean;
  /** Always `false` on a direct attack. */
  defenderDestroyed: boolean;
  /** Exactly one side is ever non-zero. */
  damage: Readonly<{ toAttackerOwner: number; toDefenderOwner: number }>;
}>;

const NO_DAMAGE = { toAttackerOwner: 0, toDefenderOwner: 0 } as const;

/**
 * The FM combat resolution table, without piercing (motor-duelo-1x1 F11
 * Capabilities; `docs/arquitetura.md` §3.5). Pure and total: no `DuelState`
 * read, no randomness.
 */
export function resolveCombatTable(input: ResolveCombatTableInput): ResolveCombatTableResult {
  const { attackerEffective, defenderEffective, defenderPosition } = input;

  if (defenderEffective === undefined || defenderPosition === undefined) {
    return {
      attackerDestroyed: false,
      defenderDestroyed: false,
      damage: { toAttackerOwner: 0, toDefenderOwner: attackerEffective.atk },
    };
  }

  if (defenderPosition === "attack") {
    if (attackerEffective.atk > defenderEffective.atk) {
      return {
        attackerDestroyed: false,
        defenderDestroyed: true,
        damage: { toAttackerOwner: 0, toDefenderOwner: attackerEffective.atk - defenderEffective.atk },
      };
    }
    if (attackerEffective.atk < defenderEffective.atk) {
      return {
        attackerDestroyed: true,
        defenderDestroyed: false,
        damage: { toAttackerOwner: defenderEffective.atk - attackerEffective.atk, toDefenderOwner: 0 },
      };
    }
    return { attackerDestroyed: true, defenderDestroyed: true, damage: NO_DAMAGE };
  }

  if (attackerEffective.atk > defenderEffective.def) {
    return { attackerDestroyed: false, defenderDestroyed: true, damage: NO_DAMAGE };
  }
  if (attackerEffective.atk < defenderEffective.def) {
    return {
      attackerDestroyed: false,
      defenderDestroyed: false,
      damage: { toAttackerOwner: defenderEffective.def - attackerEffective.atk, toDefenderOwner: 0 },
    };
  }
  return { attackerDestroyed: false, defenderDestroyed: false, damage: NO_DAMAGE };
}
