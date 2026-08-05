import { getSpellEffect, type LegalCandidate, type PublicDuelState } from "@yugioh/shared";
import type { FmBasicParameters } from "./types.ts";

export function selectSpell(state: PublicDuelState, candidates: readonly LegalCandidate[], parameters: FmBasicParameters): LegalCandidate | undefined {
  if (!parameters.playsSpells || !state.players.P2.hand.visible) return undefined;
  return candidates.find((candidate) => {
    const action = candidate.action;
    if (action.type === "play_field_spell" && !parameters.playsFieldSpells) return false;
    if (!["equip_card", "activate_spell", "play_field_spell"].includes(action.type)) return false;
    if (!("handIndex" in action)) return false;
    const card = state.players.P2.hand.visible ? state.players.P2.hand.cards[action.handIndex] : undefined;
    return card !== undefined && getSpellEffect(card.numero) !== undefined;
  });
}
