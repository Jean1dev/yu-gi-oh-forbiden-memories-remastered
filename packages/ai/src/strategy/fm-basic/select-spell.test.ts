import type { Card, LegalCandidate, PublicDuelState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { selectFmBasicAction } from "./select-action.ts";
import { selectSpell } from "./select-spell.ts";

function trap(numero: string): Card {
  return {
    id: Number(numero),
    numero,
    nome: `Trap ${numero}`,
    img: null,
    classe: "Magic",
    atk: null,
    def: null,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "armadilha",
  };
}

function stateWithHand(cards: readonly Card[]): PublicDuelState {
  const monsters = [
    { occupied: false as const },
    { occupied: false as const },
    { occupied: false as const },
    { occupied: false as const },
    { occupied: false as const },
  ] as const;
  const spells = monsters;
  const player = (hand: PublicDuelState["players"]["P1"]["hand"]) => ({
    lp: 8000,
    hand,
    remainingDeck: 35,
    field: { monsters, spells },
  });
  return {
    players: {
      P1: player({ visible: false, count: 0 }),
      P2: player({ visible: true, cards }),
    },
    activeField: null,
    activePlayer: "P2",
    turn: 2,
    phase: "main",
  } as PublicDuelState;
}

const parameters = {
  aggression: 0.5,
  playsSpells: true,
  playsFieldSpells: true,
  defensiveThreshold: 0,
};

describe("selectSpell traps", () => {
  it.each(["681", "682", "683", "684", "685", "686", "687", "688", "689"])(
    "sets specified trap %s",
    (numero) => {
      const state = stateWithHand([trap(numero)]);
      const candidate: LegalCandidate = {
        action: { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 },
        resultingState: state,
      };

      expect(selectSpell(state, [candidate], parameters)).toBe(candidate);
    },
  );

  it("skips 690 Fake Trap, which no trigger can ever match", () => {
    const state = stateWithHand([trap("690")]);
    const candidate: LegalCandidate = {
      action: { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 },
      resultingState: state,
    };

    expect(selectSpell(state, [candidate], parameters)).toBeUndefined();
  });

  it("spends the hand play on the real card behind a Fake Trap", () => {
    const ookazi = { ...trap("346"), nome: "Ookazi", classe: "Magic", tipo: "magica" as const };
    const state = stateWithHand([trap("690"), ookazi]);
    const fake: LegalCandidate = {
      action: { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 },
      resultingState: state,
    };
    const burn: LegalCandidate = {
      action: { type: "activate_spell", handIndex: 1 },
      resultingState: state,
    };

    expect(selectSpell(state, [fake, burn], parameters)).toBe(burn);
  });

  it("keeps summon above trap in the policy hierarchy", () => {
    const state = stateWithHand([trap("681")]);
    const summon: LegalCandidate = {
      action: {
        type: "summon_monster",
        player: "P2",
        handIndex: 0,
        zoneIndex: 0,
        position: "attack_face_up",
      },
      resultingState: state,
    };
    const setTrap: LegalCandidate = {
      action: { type: "play_spell_or_trap", handIndex: 0, zoneIndex: 0 },
      resultingState: state,
    };

    expect(
      selectFmBasicAction({
        state,
        legalResult: { kind: "legal_candidates", candidates: [setTrap, summon] },
        parameters,
      }),
    ).toEqual(summon.action);
  });
});
