import type { DuelAction, PlayerId, PublicDuelState } from "@yugioh/shared";
import { resolvePlayerView } from "./player-view.ts";

export function generateCandidates(
  state: PublicDuelState,
  forPlayer: PlayerId,
): readonly DuelAction[] {
  resolvePlayerView(state, forPlayer);
  return [{ type: "advance_phase" }];
}
