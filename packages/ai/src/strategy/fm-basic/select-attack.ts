import type { LegalCandidate, PublicDuelState } from "@yugioh/shared";
import type { FmBasicParameters } from "./types.ts";
import { visibleCombatValue } from "./visible-stats.ts";

export function selectAttack(
  state: PublicDuelState,
  candidates: readonly LegalCandidate[],
  parameters: FmBasicParameters,
): LegalCandidate | undefined {
  const attacks = candidates.filter((candidate) => candidate.action.type === "declare_attack");
  const direct = attacks.find(
    (candidate) =>
      candidate.action.type === "declare_attack" && candidate.action.targetZoneIndex === undefined,
  );
  if (direct !== undefined) return direct;
  return attacks.find((candidate) => {
    if (
      candidate.action.type !== "declare_attack" ||
      candidate.action.targetZoneIndex === undefined
    )
      return false;
    const attacker = state.players.P2.field.monsters[candidate.action.attackerZoneIndex];
    const target = state.players.P1.field.monsters[candidate.action.targetZoneIndex];
    if (!attacker.occupied || !attacker.card.visible) return false;
    const targetValue = visibleCombatValue(target);
    if (targetValue === undefined) return false;
    const attack = attacker.card.card.atk ?? 0;
    return parameters.aggression > 0.5 ? attack >= targetValue : attack > targetValue;
  });
}
