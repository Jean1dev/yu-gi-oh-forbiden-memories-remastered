import type { DuelAction, PlayerId, PublicDuelState } from "@yugioh/shared";
import { resolvePlayerView } from "./player-view.ts";
import { generateAttackCandidates } from "./generate-attack-candidates.ts";
import { generatePositionCandidates } from "./generate-position-candidates.ts";
import { generateSpellCandidates } from "./generate-spell-candidates.ts";
import { generateSummonCandidates } from "./generate-summon-candidates.ts";

export function generateCandidates(
  state: PublicDuelState,
  forPlayer: PlayerId,
): readonly DuelAction[] {
  const view = resolvePlayerView(state, forPlayer);
  if (!view.self.hand.visible) return [{ type: "advance_phase" }];
  return [
    ...generateSummonCandidates(view),
    ...generateSpellCandidates(view),
    ...generatePositionCandidates(view),
    ...generateAttackCandidates(view),
    { type: "advance_phase" },
  ];
}
