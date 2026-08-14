import type { DuelEvent, PlayerId, ZoneReference } from "@yugioh/shared";

export const MAX_CUE_QUEUE = 24;

export type DuelCue =
  | Readonly<{ kind: "draw"; player: PlayerId }>
  | Readonly<{ kind: "place"; zone: ZoneReference }>
  | Readonly<{ kind: "reveal"; zone: ZoneReference; cardName: string }>
  | Readonly<{ kind: "attack"; zone: ZoneReference; target?: ZoneReference | undefined }>
  | Readonly<{ kind: "damage"; player: PlayerId; amount: number }>
  | Readonly<{ kind: "destroy"; zone: ZoneReference }>;

export const CUE_DURATIONS_MS: Readonly<Record<DuelCue["kind"], number>> = {
  draw: 250,
  place: 300,
  reveal: 900,
  attack: 450,
  damage: 400,
  destroy: 300,
};

function playerFromContext(value: unknown): PlayerId | undefined {
  return value === "P1" || value === "P2" ? value : undefined;
}

function numberFromContext(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function cueFromEvent(event: DuelEvent): DuelCue | undefined {
  switch (event.type) {
    case "onDraw":
      return { kind: "draw", player: event.originPlayer };
    case "onSummon":
    case "onSet":
    case "onFlip": {
      const zone = event.involvedZones[0];
      if (!zone) return undefined;
      // A trap fires and leaves its zone in the same transition, so by the time
      // this cue plays the slot is already empty and a bare `place` flash would
      // point at nothing. The card only exists in the event, so the cue carries
      // its name — that is the player's one chance to see which trap went off.
      const card = event.involvedCards[0];
      if (event.context.cause === "trap_activation" && card) {
        return { kind: "reveal", zone, cardName: card.nome };
      }
      return { kind: "place", zone };
    }
    case "onAttackDeclared": {
      const zone = event.involvedZones[0];
      if (!zone) return undefined;
      return { kind: "attack", zone, target: event.involvedZones[1] };
    }
    case "onDamage": {
      if (event.context.kind === "effect_heal") return undefined;
      const player = playerFromContext(event.context.toPlayer);
      const amount = numberFromContext(event.context.amount);
      return player && amount !== undefined ? { kind: "damage", player, amount } : undefined;
    }
    case "onDestroy": {
      const zone = event.involvedZones[0];
      return zone ? { kind: "destroy", zone } : undefined;
    }
    case "onTurnStart":
    case "onTurnEnd":
    case "onPositionChange":
      return undefined;
  }
}

export function toCues(events: readonly DuelEvent[]): readonly DuelCue[] {
  const cues: DuelCue[] = [];
  for (const event of events) {
    if (cues.length >= MAX_CUE_QUEUE) break;
    const cue = cueFromEvent(event);
    if (cue) cues.push(cue);
  }
  return cues;
}
