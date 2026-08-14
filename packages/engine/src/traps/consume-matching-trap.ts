import {
  getTrapEffect,
  type Card,
  type DuelEvent,
  type DuelState,
  type PlayerId,
  type TrapEffect,
  type ZoneIndex,
} from "@yugioh/shared";

import { createEvent } from "../events/index.ts";
import { replaceZone } from "../field/replace-zone.ts";

const ZONE_INDICES: readonly ZoneIndex[] = [0, 1, 2, 3, 4];

export type ConsumedTrap = Readonly<{
  state: DuelState;
  events: readonly DuelEvent[];
  card: Card;
  effect: TrapEffect;
  zoneIndex: ZoneIndex;
}>;

/** Finds and consumes the first matching face-down trap in stable zone order. */
export function consumeMatchingTrap(
  state: DuelState,
  owner: PlayerId,
  matches: (effect: TrapEffect) => boolean,
): ConsumedTrap | undefined {
  for (const zoneIndex of ZONE_INDICES) {
    const zone = state.players[owner].field.spells[zoneIndex];
    if (!zone.occupied || zone.faceUp || zone.card.tipo !== "armadilha") continue;
    const effect = getTrapEffect(zone.card.numero);
    if (effect === undefined || !matches(effect)) continue;

    const player = state.players[owner];
    const reference = { player: owner, zoneType: "spell" as const, index: zoneIndex };
    const nextState: DuelState = {
      ...state,
      players: {
        ...state.players,
        [owner]: {
          ...player,
          field: {
            ...player.field,
            spells: replaceZone(player.field.spells, zoneIndex, { occupied: false }),
          },
        },
      },
    };
    const activation = createEvent({
      type: "onFlip",
      originPlayer: owner,
      involvedCards: [zone.card],
      involvedZones: [reference],
      context: { cause: "trap_activation", effect: effect.type, by: zone.card.numero },
    });
    const consumption = createEvent({
      type: "onDestroy",
      originPlayer: owner,
      involvedCards: [zone.card],
      involvedZones: [reference],
      context: { cause: "trap_consumed", by: zone.card.numero },
    });
    return {
      state: nextState,
      events: [activation, consumption],
      card: zone.card,
      effect,
      zoneIndex,
    };
  }
  return undefined;
}
