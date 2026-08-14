import { describe, expect, it } from "vitest";
import type { Card, PublicDuelState, PublicMonsterZone, PublicPlayerState } from "@yugioh/shared";
import { generateCandidates } from "./generate-candidates.ts";

const emptyMonsters = (): PublicPlayerState["field"]["monsters"] => [
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
];
const emptySpells = (): PublicPlayerState["field"]["spells"] => [
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
  { occupied: false },
];
const card = (id: number): Card => ({
  id,
  numero: String(id).padStart(3, "0"),
  nome: `Monster ${id}`,
  img: null,
  classe: "Dragon",
  atk: 1000,
  def: 1000,
  guardiao1: "Sun",
  guardiao2: "Moon",
  password: null,
  estrelas: null,
  tipo: "monstro",
});

function state(hand: readonly Card[], opponentMonsters = emptyMonsters()): PublicDuelState {
  const player = (
    ownHand: PublicPlayerState["hand"],
    monsters: PublicPlayerState["field"]["monsters"],
  ): PublicPlayerState => ({
    lp: 8000,
    hand: ownHand,
    remainingDeck: 35,
    field: { monsters, spells: emptySpells() },
  });
  return {
    players: {
      P1: player({ visible: false, count: 5 }, opponentMonsters),
      P2: player({ visible: true, cards: hand }, emptyMonsters()),
    },
    activeField: null,
    activePlayer: "P2",
    turn: 2,
    phase: "main",
  };
}

describe("generateCandidates", () => {
  it("creates exactly 100 summons for five monsters and five free zones", () => {
    const actions = generateCandidates(state([1, 2, 3, 4, 5].map(card)), "P2");
    expect(actions.filter((action) => action.type === "summon_monster")).toHaveLength(100);
  });

  it("always ends with one advance and never generates surrender or resolve_attack", () => {
    const input = state([card(1)]);
    const before = JSON.stringify(input);
    const first = generateCandidates(input, "P2");
    expect(first.at(-1)).toEqual({ type: "advance_phase" });
    expect(first.filter((action) => action.type === "advance_phase")).toHaveLength(1);
    expect(
      first.some((action) => action.type === "surrender" || action.type === "resolve_attack"),
    ).toBe(false);
    expect(generateCandidates(input, "P2")).toEqual(first);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("targets occupied hidden monsters without reading their card", () => {
    const hidden: PublicMonsterZone = {
      occupied: true,
      card: { visible: false },
      position: "defense_face_down",
      hasAttacked: false,
      hasChangedPosition: false,
      equips: [],
    };
    const withHidden: PublicPlayerState["field"]["monsters"] = [
      hidden,
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
    ];
    const actions = generateCandidates(state([], withHidden), "P2");
    expect(
      actions.some((action) => action.type === "declare_attack" && action.targetZoneIndex === 0),
    ).toBe(false);
  });

  it("returns only advance when the requested hand is hidden", () => {
    expect(generateCandidates(state([]), "P1")).toEqual([{ type: "advance_phase" }]);
  });

  describe("magia com alvo unico", () => {
    const stopDefense: Card = {
      ...card(320),
      numero: "320",
      nome: "Stop Defense",
      classe: "Magic",
      atk: null,
      def: null,
      tipo: "magica",
    };

    const defending = (position: "defense_face_up" | "attack_face_up"): PublicMonsterZone => ({
      occupied: true,
      card: { visible: true, card: card(1) },
      position,
      hasAttacked: false,
      hasChangedPosition: false,
      equips: [],
    });

    function opponentField(
      ...zones: readonly PublicMonsterZone[]
    ): PublicPlayerState["field"]["monsters"] {
      const monsters = emptyMonsters().map((zone, index) => zones[index] ?? zone);
      return monsters as unknown as PublicPlayerState["field"]["monsters"];
    }

    it("gera um candidato por zona legal do oponente, como o braco de equipamento faz", () => {
      const actions = generateCandidates(
        state(
          [stopDefense],
          opponentField(defending("defense_face_up"), defending("defense_face_up")),
        ),
        "P2",
      );

      expect(actions.filter((action) => action.type === "activate_spell")).toEqual([
        {
          type: "activate_spell",
          handIndex: 0,
          targetZone: { player: "P1", zoneType: "monster", index: 0 },
        },
        {
          type: "activate_spell",
          handIndex: 0,
          targetZone: { player: "P1", zoneType: "monster", index: 1 },
        },
      ]);
    });

    it("nao propoe a carta quando nao ha monstro em defesa para atingir", () => {
      const actions = generateCandidates(
        state([stopDefense], opponentField(defending("attack_face_up"))),
        "P2",
      );

      expect(actions.filter((action) => action.type === "activate_spell")).toEqual([]);
    });
  });
});
