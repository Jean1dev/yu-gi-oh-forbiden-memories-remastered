import type { Card, DuelState, MonsterPosition, PlayerField, ZoneReference } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import {
  describeActionSlots,
  describeAffordances,
  reduceIntent,
  zoneAffordance,
  zoneReference,
  type DuelIntent,
} from "./duel-interaction.ts";

const monster: Card = {
  id: 1,
  numero: "001",
  nome: "Dragon",
  img: null,
  classe: "Dragon",
  atk: 1200,
  def: 900,
  guardiao1: "Sun",
  guardiao2: "Moon",
  password: "00 00 00 01",
  estrelas: 1,
  tipo: "monstro",
};

const spell: Card = { ...monster, id: 2, numero: "002", nome: "Spell", atk: null, def: null, tipo: "magica" };

function emptyField(): PlayerField {
  return {
    monsters: [
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
    ],
    spells: [
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
    ],
  };
}

function state(overrides: Partial<DuelState> = {}): DuelState {
  return {
    players: {
      P1: { lp: 8000, hand: [monster, spell], deck: [], field: emptyField(), handPlayUsed: false },
      P2: { lp: 8000, hand: [], deck: [], field: emptyField(), handPlayUsed: false },
    },
    activeField: null,
    activePlayer: "P1",
    turn: 2,
    phase: "main",
    seed: 1,
    ...overrides,
  };
}

function withMonster(base: DuelState, reference: ZoneReference, card = monster, extras = {}) {
  const player = base.players[reference.player];
  const nextZone = {
    occupied: true as const,
    card,
    position: "attack_face_up" as const,
    hasAttacked: false,
    hasChangedPosition: false,
    ...extras,
  };
  const monsters = player.field.monsters.map((zone, index) =>
    index === reference.index ? nextZone : zone,
  ) as unknown as typeof player.field.monsters;
  return {
    ...base,
    players: {
      ...base.players,
      [reference.player]: { ...player, field: { ...player.field, monsters } },
    },
  };
}

describe("duel interaction reducer", () => {
  it("selects a hand card and opens summon flow straight into the next free zone", () => {
    const selected = reduceIntent({ kind: "idle" }, { type: "select_hand_card", handIndex: 0 }, state());
    expect(selected.intent).toEqual({ kind: "card_selected", handIndex: 0 });
    const choosingPosition = reduceIntent(selected.intent, { type: "invoke_slot", id: "summon" }, state());
    expect(choosingPosition.intent).toEqual({ kind: "choosing_position", handIndex: 0, zoneIndex: 0 });

    const positions: MonsterPosition[] = [
      "attack_face_up",
      "attack_face_down",
      "defense_face_up",
      "defense_face_down",
    ];
    for (const position of positions) {
      expect(
        reduceIntent(choosingPosition.intent, { type: "choose_position", position }, state()).action,
      ).toEqual({ type: "summon_monster", player: "P1", handIndex: 0, zoneIndex: 0, position });
    }
  });

  it("skips occupied zones and picks the next free one when summoning", () => {
    const occupied = withMonster(state(), zoneReference("P1", "monster", 0));
    const choosingPosition = reduceIntent(
      { kind: "card_selected", handIndex: 0 },
      { type: "invoke_slot", id: "summon" },
      occupied,
    );
    expect(choosingPosition.intent).toEqual({ kind: "choosing_position", handIndex: 0, zoneIndex: 1 });
  });

  it("uses set as a shortcut straight to defense face down in the next free zone", () => {
    const base: DuelIntent = { kind: "card_selected", handIndex: 0 };
    const result = reduceIntent(base, { type: "invoke_slot", id: "set" }, state());
    expect(result.intent).toEqual({ kind: "idle" });
    expect(result.action).toEqual({
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 0,
      position: "defense_face_down",
    });
  });

  it("places a spell or trap in the back row", () => {
    const selected: DuelIntent = { kind: "card_selected", handIndex: 1 };
    const choosingZone = reduceIntent(selected, { type: "invoke_slot", id: "place" }, state());
    expect(choosingZone.intent).toEqual({ kind: "choosing_zone", handIndex: 1 });
    expect(
      reduceIntent(
        choosingZone.intent,
        { type: "activate_zone", reference: zoneReference("P1", "spell", 3) },
        state(),
      ).action,
    ).toEqual({ type: "play_spell_or_trap", handIndex: 1, zoneIndex: 3 });
  });

  it("declares targeted and direct attacks", () => {
    const battle = withMonster(
      withMonster(state({ phase: "battle" }), zoneReference("P1", "monster", 0)),
      zoneReference("P2", "monster", 1),
    );
    const choosingAttacker = reduceIntent({ kind: "idle" }, { type: "invoke_slot", id: "attack" }, battle);
    const choosingTarget = reduceIntent(
      choosingAttacker.intent,
      { type: "activate_zone", reference: zoneReference("P1", "monster", 0) },
      battle,
    );
    expect(
      reduceIntent(
        choosingTarget.intent,
        { type: "activate_zone", reference: zoneReference("P2", "monster", 1) },
        battle,
      ).action,
    ).toEqual({ type: "declare_attack", attackerZoneIndex: 0, targetZoneIndex: 1 });

    const directBattle = withMonster(state({ phase: "battle" }), zoneReference("P1", "monster", 0));
    const directIntent: DuelIntent = { kind: "choosing_target", attackerZoneIndex: 0 };
    expect(reduceIntent(directIntent, { type: "invoke_slot", id: "direct_attack" }, directBattle).action).toEqual({
      type: "declare_attack",
      attackerZoneIndex: 0,
    });
  });

  it("changes position from a player monster in battle", () => {
    const battle = withMonster(state({ phase: "battle" }), zoneReference("P1", "monster", 4));
    const choosing = reduceIntent({ kind: "idle" }, { type: "invoke_slot", id: "change_position" }, battle);
    expect(
      reduceIntent(choosing.intent, { type: "activate_zone", reference: zoneReference("P1", "monster", 4) }, battle)
        .action,
    ).toEqual({ type: "change_position", zone: zoneReference("P1", "monster", 4) });
  });

  it("ignores inapplicable events and resets after producing an action", () => {
    const base: DuelIntent = { kind: "idle" };
    expect(reduceIntent(base, { type: "choose_position", position: "attack_face_up" }, state()).intent).toBe(base);
    expect(reduceIntent({ kind: "card_selected", handIndex: 0 }, { type: "cancel" }, state()).intent).toEqual({
      kind: "idle",
    });
    expect(
      reduceIntent(
        { kind: "choosing_position", handIndex: 0, zoneIndex: 0 },
        { type: "choose_position", position: "attack_face_up" },
        state(),
      ).intent,
    ).toEqual({ kind: "idle" });
  });
});

describe("duel affordances", () => {
  it("denies acting on opponent turn, busy or ended states", () => {
    expect(
      describeAffordances({ state: state(), isPlayerTurn: false, busy: false, intent: { kind: "idle" } }).canAct,
    ).toBe(false);
    expect(describeAffordances({ state: state(), isPlayerTurn: true, busy: true, intent: { kind: "idle" } }).canAct).toBe(
      false,
    );
    expect(
      describeAffordances({
        state: state({ outcome: { status: "draw", winner: null, loser: null, reason: "draw" } }),
        isPlayerTurn: true,
        busy: false,
        intent: { kind: "idle" },
      }).canAct,
    ).toBe(false);
  });

  it("mirrors hand play, summon and spell placement guards", () => {
    expect(
      describeAffordances({
        state: state({ phase: "battle" }),
        isPlayerTurn: true,
        busy: false,
        intent: { kind: "card_selected", handIndex: 0 },
      }).canSummon,
    ).toBe(false);
    expect(
      describeAffordances({
        state: state({
          players: { ...state().players, P1: { ...state().players.P1, handPlayUsed: true } },
        }),
        isPlayerTurn: true,
        busy: false,
        intent: { kind: "card_selected", handIndex: 0 },
      }).canSummon,
    ).toBe(false);
    expect(
      describeAffordances({ state: state(), isPlayerTurn: true, busy: false, intent: { kind: "card_selected", handIndex: 1 } })
        .canSummon,
    ).toBe(false);
    expect(
      describeAffordances({ state: state(), isPlayerTurn: true, busy: false, intent: { kind: "card_selected", handIndex: 0 } })
        .canPlaceSpell,
    ).toBe(false);
  });

  it("mirrors attack, direct attack and position change guards", () => {
    const firstTurn = withMonster(state({ phase: "battle", turn: 1 }), zoneReference("P1", "monster", 0));
    expect(
      describeAffordances({ state: firstTurn, isPlayerTurn: true, busy: false, intent: { kind: "idle" } }).canAttack,
    ).toBe(false);

    const faceDownAttack = withMonster(state({ phase: "battle" }), zoneReference("P1", "monster", 0), monster, {
      position: "attack_face_down",
    });
    expect(
      describeAffordances({ state: faceDownAttack, isPlayerTurn: true, busy: false, intent: { kind: "idle" } })
        .canAttack,
    ).toBe(true);

    const alreadyAttacked = withMonster(state({ phase: "battle" }), zoneReference("P1", "monster", 0), monster, {
      hasAttacked: true,
    });
    expect(
      describeAffordances({ state: alreadyAttacked, isPlayerTurn: true, busy: false, intent: { kind: "idle" } })
        .canAttack,
    ).toBe(false);
    expect(
      describeAffordances({ state: alreadyAttacked, isPlayerTurn: true, busy: false, intent: { kind: "idle" } })
        .canChangePosition,
    ).toBe(false);
    expect(
      describeAffordances({ state: faceDownAttack, isPlayerTurn: true, busy: false, intent: { kind: "idle" } })
        .canDirectAttack,
    ).toBe(true);
    expect(
      describeAffordances({
        state: withMonster(faceDownAttack, zoneReference("P2", "monster", 0)),
        isPlayerTurn: true,
        busy: false,
        intent: { kind: "idle" },
      }).canDirectAttack,
    ).toBe(false);
    expect(
      describeAffordances({ state: state({ phase: "main" }), isPlayerTurn: true, busy: false, intent: { kind: "idle" } })
        .canChangePosition,
    ).toBe(false);
  });

  it("returns exactly three slots and keeps phase advance in the primary slot", () => {
    const affordances = describeAffordances({
      state: state(),
      isPlayerTurn: true,
      busy: false,
      intent: { kind: "card_selected", handIndex: 0 },
    });
    const slots = describeActionSlots({ intent: { kind: "card_selected", handIndex: 0 }, state: state() }, affordances);
    expect(slots).toHaveLength(3);
    expect(slots[2]).toMatchObject({ id: "advance_phase", variant: "primary" });
  });

  it("classifies zones for the current intent", () => {
    const base = withMonster(state({ phase: "battle" }), zoneReference("P2", "monster", 1));
    expect(zoneAffordance(base, { kind: "choosing_zone", handIndex: 0 }, zoneReference("P1", "spell", 2))).toBe(
      "selectable",
    );
    expect(zoneAffordance(base, { kind: "choosing_target", attackerZoneIndex: 0 }, zoneReference("P2", "monster", 1))).toBe(
      "target",
    );
    expect(zoneAffordance(base, { kind: "choosing_zone", handIndex: 0 }, zoneReference("P2", "monster", 1))).toBe(
      "idle",
    );
  });
});
