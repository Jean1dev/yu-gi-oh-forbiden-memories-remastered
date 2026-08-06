import type { LegalCandidate, PublicDuelState } from "@yugioh/shared";
import type { FmBasicParameters } from "./types.ts";
import { visibleCombatValue } from "./visible-stats.ts";

export function selectSummon(
  state: PublicDuelState,
  candidates: readonly LegalCandidate[],
  parameters: FmBasicParameters,
): LegalCandidate | undefined {
  const hand = state.players.P2.hand;
  if (!hand.visible) return undefined;
  const strongestOpponent = Math.max(
    0,
    ...state.players.P1.field.monsters.map((zone) => visibleCombatValue(zone) ?? 0),
  );
  return candidates
    .filter((candidate) => candidate.action.type === "summon_monster")
    .filter((candidate) => {
      const action = candidate.action as Extract<
        typeof candidate.action,
        { type: "summon_monster" }
      >;
      const card = hand.cards[action.handIndex];
      if (card === undefined) return false;
      const offensive = (card.atk ?? 0) > strongestOpponent + parameters.defensiveThreshold;
      const preferred =
        strongestOpponent === 0 || offensive ? "attack_face_up" : "defense_face_down";
      return action.position === preferred;
    })
    .sort((left, right) => {
      const leftAction = left.action as Extract<typeof left.action, { type: "summon_monster" }>;
      const rightAction = right.action as Extract<typeof right.action, { type: "summon_monster" }>;
      return (
        (hand.cards[rightAction.handIndex]?.atk ?? 0) -
          (hand.cards[leftAction.handIndex]?.atk ?? 0) ||
        leftAction.handIndex - rightAction.handIndex ||
        leftAction.zoneIndex - rightAction.zoneIndex
      );
    })[0];
}
