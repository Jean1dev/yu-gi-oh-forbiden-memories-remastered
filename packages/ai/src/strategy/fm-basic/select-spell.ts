import {
  getSpellEffect,
  getTrapEffect,
  type LegalCandidate,
  type PublicDuelState,
} from "@yugioh/shared";
import type { FmBasicParameters } from "./types.ts";

export function selectSpell(
  state: PublicDuelState,
  candidates: readonly LegalCandidate[],
  parameters: FmBasicParameters,
): LegalCandidate | undefined {
  if (!parameters.playsSpells || !state.players.P2.hand.visible) return undefined;
  return candidates.find((candidate) => {
    const action = candidate.action;
    if (action.type === "play_field_spell" && !parameters.playsFieldSpells) return false;
    if (
      !["equip_card", "activate_spell", "play_field_spell", "play_spell_or_trap"].includes(
        action.type,
      )
    )
      return false;
    if (!("handIndex" in action)) return false;
    const card = state.players.P2.hand.visible
      ? state.players.P2.hand.cards[action.handIndex]
      : undefined;
    if (card === undefined) return false;
    if (getSpellEffect(card.numero) !== undefined) return true;
    // 690 Fake Trap matches no trigger by design (`docs/traps/fake-trap.md`),
    // and setting it still burns the turn's single hand play — so the CPU skips
    // it and keeps looking for a card that can actually do something.
    const trap = getTrapEffect(card.numero);
    return trap !== undefined && trap.type !== "decoy";
  });
}
