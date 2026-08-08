import type { Action, Card, CardNumber, DuelState, InitializationInput } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { closeReactionWindow } from "../events/index.ts";
import { initDuel } from "../initialization/init-duel.ts";
import { load, serialize } from "../serialization/index.ts";
import { apply } from "../turn/apply.ts";

function makeCard(index: number, atk: number): Card {
  const cardNumber = String(index).padStart(3, "0") as CardNumber;
  return {
    id: index,
    numero: cardNumber,
    nome: `Card ${cardNumber}`,
    img: null,
    classe: "Warrior",
    atk,
    def: 1000,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
    atributo: null,
    nivel: null,
    descricao: null,
  };
}

function deck(startAt: number, atk: number): readonly Card[] {
  return Array.from({ length: 40 }, (_, i) => makeCard(startAt + i, atk));
}

function startDuel(): DuelState {
  const input: InitializationInput = {
    players: { P1: { cards: deck(1, 3000) }, P2: { cards: deck(101, 3000) } },
    seed: 1753617600,
  };
  return initDuel(input);
}

/** Applies each action in order, failing loudly on the first refusal. */
function run(state: DuelState, actions: readonly Action[]): DuelState {
  return actions.reduce((current, action) => {
    const result = apply(current, action);
    if (!result.ok) {
      throw new Error(`${action.type} refused: ${result.error.code}`);
    }
    return result.value.state;
  }, state);
}

function closeWindow(state: DuelState): DuelState {
  const closed = closeReactionWindow(state);
  if (!closed.ok) {
    throw new Error(`Expected a reaction window to be open: ${closed.error.code}`);
  }
  return closed.value;
}

/** Walks the phase cycle until the next player's turn starts. */
function passTurn(state: DuelState): DuelState {
  const startingTurn = state.turn;
  let current = state;
  while (current.turn === startingTurn) {
    current = run(current, [{ type: "advance_phase" }]);
  }
  return current;
}

describe("full match (motor-duelo-1x1 cross-feature integration)", () => {
  it("runs from initDuel to an LP-depleted winner without inconsistent state", () => {
    const initial = startDuel();
    expect(initial.outcome).toBeUndefined();

    // First turn: draw, summon from hand, and confirm attacks are still forbidden.
    const summoned = run(initial, [
      { type: "advance_phase" },
      {
        type: "summon_monster",
        player: initial.activePlayer,
        handIndex: 0,
        zoneIndex: 0,
        position: "attack_face_up",
      },
    ]);
    expect(summoned.players[initial.activePlayer].field.monsters[0].occupied).toBe(true);

    const battle = run(closeWindow(summoned), [{ type: "advance_phase" }]);
    const blocked = apply(battle, { type: "declare_attack", attackerZoneIndex: 0 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe("first_turn_attack_forbidden");

    // Pass the turn; the opponent takes a full empty turn.
    const opponentTurn = passTurn(battle);
    expect(opponentTurn.activePlayer).not.toBe(initial.activePlayer);
    const backToAttacker = passTurn(opponentTurn);
    expect(backToAttacker.activePlayer).toBe(initial.activePlayer);

    // Later turns: two direct 3000 attacks are not enough; three are enough.
    let current = run(backToAttacker, [{ type: "advance_phase" }, { type: "advance_phase" }]);
    expect(current.phase).toBe("battle");

    let attacksLanded = 0;
    while (current.outcome === undefined && attacksLanded < 3) {
      const beforeLp = current.players[current.activePlayer === "P1" ? "P2" : "P1"].lp;
      current = run(current, [
        { type: "declare_attack", attackerZoneIndex: 0 },
        { type: "resolve_attack" },
      ]);
      const afterLp = current.players[current.activePlayer === "P1" ? "P2" : "P1"].lp;
      expect(afterLp).toBeLessThan(beforeLp);
      attacksLanded += 1;
      if (current.outcome !== undefined) break;

      // A monster attacks once per turn: loop back to the next Battle phase.
      current = passTurn(current);
      current = passTurn(current);
      current = run(current, [{ type: "advance_phase" }, { type: "advance_phase" }]);
    }

    const defender = initial.activePlayer === "P1" ? "P2" : "P1";
    expect(current.players[defender].lp).toBe(0);
    expect(current.outcome).toEqual({
      status: "decisive",
      winner: initial.activePlayer,
      loser: defender,
      reason: "lp_depleted",
    });

    // Frozen: no action is accepted after the duel ends.
    const afterEnd = apply(current, { type: "advance_phase" });
    expect(afterEnd.ok).toBe(false);
    if (!afterEnd.ok) expect(afterEnd.error.code).toBe("duel_already_ended");

    // The ended state survives the F05 snapshot round-trip.
    const reloaded = load(serialize(current));
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) expect(reloaded.value.outcome).toEqual(current.outcome);
  });

  it("ends by surrender at any moment and returns the same result after round-trip", () => {
    const initial = startDuel();

    const conceded = run(initial, [{ type: "surrender", player: "P1" }]);

    expect(conceded.outcome).toEqual({
      status: "decisive",
      winner: "P2",
      loser: "P1",
      reason: "surrender",
    });

    const reloaded = load(serialize(conceded));
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) expect(reloaded.value).toEqual(conceded);
  });
});

describe("duel statistics over a full match (rating-engine F01)", () => {
  /**
   * Plays the same scripted opening twice and returns both final states: the
   * counters are part of the deterministic state, so the same seed and the
   * same actions must reproduce them exactly.
   */
  function playScriptedOpening(): DuelState {
    const initial = startDuel();
    const attacker = initial.activePlayer;
    const defender = attacker === "P1" ? "P2" : "P1";

    // Attacker's turn: a monster in attack position.
    const attackerSummoned = closeWindow(
      run(initial, [
        { type: "advance_phase" },
        {
          type: "summon_monster",
          player: attacker,
          handIndex: 0,
          zoneIndex: 0,
          position: "attack_face_up",
        },
      ]),
    );

    // Defender's turn: a monster in attack position, so the trade below counts.
    const defenderSummoned = closeWindow(
      run(passTurn(attackerSummoned), [
        { type: "advance_phase" },
        {
          type: "summon_monster",
          player: defender,
          handIndex: 0,
          zoneIndex: 0,
          position: "attack_face_up",
        },
      ]),
    );

    // Attacker's next turn: trade the two monsters. Equal ATK destroys both,
    // and the target was in attack posture, so it is an effective attack.
    const traded = run(passTurn(defenderSummoned), [
      { type: "advance_phase" },
      { type: "advance_phase" },
      { type: "declare_attack", attackerZoneIndex: 0, targetZoneIndex: 0 },
      { type: "resolve_attack" },
    ]);

    // Defender's next turn: set a monster face down.
    return closeWindow(
      run(passTurn(traded), [
        { type: "advance_phase" },
        {
          type: "summon_monster",
          player: defender,
          handIndex: 0,
          zoneIndex: 0,
          position: "defense_face_down",
        },
      ]),
    );
  }

  it("accumulates a consistent set of counters for both players", () => {
    const initial = startDuel();
    const attacker = initial.activePlayer;
    const defender = attacker === "P1" ? "P2" : "P1";

    const final = playScriptedOpening();

    expect(final.stats[attacker].effectiveAttacks).toBe(1);
    expect(final.stats[defender].effectiveAttacks).toBe(0);
    expect(final.stats[defender].faceDownPlays).toBe(1);
    expect(final.stats[attacker].faceDownPlays).toBe(0);

    // Nothing else was played, so every other counter stayed at zero.
    for (const player of [attacker, defender] as const) {
      expect(final.stats[player].fusions).toBe(0);
      expect(final.stats[player].equips).toBe(0);
      expect(final.stats[player].pureMagics).toBe(0);
      expect(final.stats[player].triggeredTraps).toBe(0);
    }
  });

  it("reproduces identical stats when replayed from the same seed and actions", () => {
    expect(playScriptedOpening().stats).toEqual(playScriptedOpening().stats);
  });

  it("survives the snapshot round-trip with the counters intact", () => {
    const final = playScriptedOpening();

    const reloaded = load(serialize(final));

    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) expect(reloaded.value.stats).toEqual(final.stats);
  });
});
