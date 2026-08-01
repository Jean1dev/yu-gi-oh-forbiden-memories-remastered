import {
  DomainError,
  err,
  ok,
  type ApplyResult,
  type DuelEvent,
  type DuelState,
  type MonsterZone,
  type Result,
  type ZoneReference,
} from "@yugioh/shared";

import { createEvent, hasOpenReactionWindow } from "../events/index.ts";
import { isFaceDown, nextPosition } from "./next-position.ts";

/**
 * Changes the position of the monster referenced by `zone` (motor-duelo-1x1
 * F10): alternates attack/defense and, if the monster was face-down, reveals
 * it in the process. Restricted to the Battle phase; does not consume the
 * turn's hand play and does not read/write `hasAttacked` (spec Decision 6).
 */
export function changePosition(
  state: DuelState,
  zone: ZoneReference,
): Result<ApplyResult, DomainError> {
  if (hasOpenReactionWindow(state)) {
    return err(
      new DomainError(
        "Não é possível mudar de posição com uma janela de reação aberta.",
        "reaction_window_open",
        { pendingEventType: state.pending?.event.type },
      ),
    );
  }

  if (state.phase !== "battle") {
    return err(
      new DomainError("Position changes are only allowed during the Battle phase.", "wrong_phase", {
        phase: state.phase,
      }),
    );
  }

  if (zone.zoneType !== "monster") {
    return err(
      new DomainError("The referenced zone is not a monster zone.", "zone_not_monster", { zone }),
    );
  }

  if (zone.player !== state.activePlayer) {
    return err(
      new DomainError(
        "Only a monster zone of the active player can change position.",
        "zone_not_owned_by_active_player",
        { zone, activePlayer: state.activePlayer },
      ),
    );
  }

  const monsterZone = state.players[zone.player].field.monsters[zone.index];
  if (!monsterZone.occupied) {
    return err(new DomainError("The referenced monster zone is empty.", "zone_empty", { zone }));
  }

  if (monsterZone.hasChangedPosition) {
    return err(
      new DomainError(
        "This monster already changed position this turn.",
        "already_changed_position",
        { zone },
      ),
    );
  }

  const revealed = isFaceDown(monsterZone.position);
  const updatedZone: MonsterZone = {
    ...monsterZone,
    position: nextPosition(monsterZone.position),
    hasChangedPosition: true,
  };

  const [z0, z1, z2, z3, z4] = state.players[zone.player].field.monsters;
  const withZone = (index: number, current: typeof z0) => (index === zone.index ? updatedZone : current);
  const nextMonsters: typeof state.players.P1.field.monsters = [
    withZone(0, z0),
    withZone(1, z1),
    withZone(2, z2),
    withZone(3, z3),
    withZone(4, z4),
  ];

  const nextState: DuelState = {
    ...state,
    players: {
      ...state.players,
      [zone.player]: {
        ...state.players[zone.player],
        field: { ...state.players[zone.player].field, monsters: nextMonsters },
      },
    },
  };

  const eventInput = { originPlayer: zone.player, involvedCards: [monsterZone.card], involvedZones: [zone] };
  const events: DuelEvent[] = revealed
    ? [createEvent({ type: "onFlip", ...eventInput }), createEvent({ type: "onPositionChange", ...eventInput })]
    : [createEvent({ type: "onPositionChange", ...eventInput })];

  return ok({ state: nextState, events });
}
