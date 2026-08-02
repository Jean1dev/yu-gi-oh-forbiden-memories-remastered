import type { ApplyResult, DuelState, MonsterZone, Phase, PlayerState } from "@yugioh/shared";

import { drawUpToHandSize } from "../draw/index.ts";
import { createEvent } from "../events/index.ts";
import { getOpponent } from "../spells/opponent.ts";

const NEXT_PHASE: Readonly<Record<Phase, Phase>> = {
  draw: "main",
  main: "battle",
  battle: "end",
  end: "draw",
};

function resetTurnFlags(zone: MonsterZone): MonsterZone {
  return zone.occupied ? { ...zone, hasAttacked: false, hasChangedPosition: false } : zone;
}

function endTurnFor(player: PlayerState): PlayerState {
  const [a, b, c, d, e] = player.field.monsters;
  return {
    ...player,
    field: {
      ...player.field,
      monsters: [
        resetTurnFlags(a),
        resetTurnFlags(b),
        resetTurnFlags(c),
        resetTurnFlags(d),
        resetTurnFlags(e),
      ],
    },
  };
}

/**
 * Decides the next `{ phase, turn, activePlayer }` from the current state and
 * the events that transition emits (spec Fluxo, passos 2-3). Not exported
 * publicly — `apply` is the only caller, after it has already checked
 * `hasOpenReactionWindow` (spec Decision 7).
 */
export function advancePhase(state: DuelState): ApplyResult {
  if (state.phase === "draw") {
    const drawn = drawUpToHandSize(state);
    return { state: { ...drawn.state, phase: NEXT_PHASE.draw }, events: drawn.events };
  }

  if (state.phase !== "end") {
    return { state: { ...state, phase: NEXT_PHASE[state.phase] }, events: [] };
  }

  const endingPlayer = state.activePlayer;
  const nextPlayer = getOpponent(endingPlayer);

  const nextState: DuelState = {
    ...state,
    players: {
      ...state.players,
      [endingPlayer]: endTurnFor(state.players[endingPlayer]),
      [nextPlayer]: { ...state.players[nextPlayer], handPlayUsed: false },
    },
    activePlayer: nextPlayer,
    turn: state.turn + 1,
    phase: "draw",
  };

  return {
    state: nextState,
    events: [
      createEvent({ type: "onTurnEnd", originPlayer: endingPlayer }),
      createEvent({ type: "onTurnStart", originPlayer: nextPlayer }),
    ],
  };
}
