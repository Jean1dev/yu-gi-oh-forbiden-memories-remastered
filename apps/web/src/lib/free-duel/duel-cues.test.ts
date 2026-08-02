import fc from "fast-check";
import type { DuelEvent, EventType, PlayerId, ZoneReference } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { MAX_CUE_QUEUE, toCues } from "./duel-cues.ts";

const zone = (player: PlayerId, index = 0): ZoneReference => ({ player, zoneType: "monster", index: index as never });

function event(type: EventType, overrides: Partial<DuelEvent> = {}): DuelEvent {
  return {
    type,
    originPlayer: "P1",
    involvedCards: [],
    involvedZones: [],
    context: {},
    ...overrides,
  };
}

describe("duel cues", () => {
  it("maps draw, placement, attack, damage and destruction events", () => {
    expect(toCues([event("onDraw", { originPlayer: "P2" })])).toEqual([{ kind: "draw", player: "P2" }]);
    expect(toCues([event("onSummon", { involvedZones: [zone("P1", 1)] })])).toEqual([
      { kind: "place", zone: zone("P1", 1) },
    ]);
    expect(toCues([event("onAttackDeclared", { involvedZones: [zone("P1", 2), zone("P2", 3)] })])).toEqual([
      { kind: "attack", zone: zone("P1", 2), target: zone("P2", 3) },
    ]);
    expect(toCues([event("onDamage", { context: { toPlayer: "P2", amount: 1200 } })])).toEqual([
      { kind: "damage", player: "P2", amount: 1200 },
    ]);
    expect(toCues([event("onDestroy", { involvedZones: [zone("P2", 4)] })])).toEqual([
      { kind: "destroy", zone: zone("P2", 4) },
    ]);
  });

  it("ignores turn and position events and preserves cue order", () => {
    expect(
      toCues([
        event("onTurnStart"),
        event("onSet", { involvedZones: [zone("P1", 0)] }),
        event("onPositionChange", { involvedZones: [zone("P1", 0)] }),
        event("onTurnEnd"),
        event("onDraw", { originPlayer: "P1" }),
      ]),
    ).toEqual([{ kind: "place", zone: zone("P1", 0) }, { kind: "draw", player: "P1" }]);
  });

  it("limits the queue", () => {
    const events = Array.from({ length: 40 }, () => event("onDraw"));
    expect(toCues(events)).toHaveLength(MAX_CUE_QUEUE);
  });

  it("is total over arbitrary event arrays", () => {
    const eventTypes: EventType[] = [
      "onTurnStart",
      "onDraw",
      "onSummon",
      "onSet",
      "onFlip",
      "onPositionChange",
      "onAttackDeclared",
      "onDamage",
      "onDestroy",
      "onTurnEnd",
    ];
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom(...eventTypes),
            originPlayer: fc.constantFrom("P1" as const, "P2" as const),
            involvedCards: fc.constant([]),
            involvedZones: fc.array(
              fc.record({
                player: fc.constantFrom("P1" as const, "P2" as const),
                zoneType: fc.constantFrom("monster" as const, "spell" as const),
                index: fc.integer({ min: 0, max: 4 }).map((index) => index as ZoneReference["index"]),
              }),
              { maxLength: 3 },
            ),
            context: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))),
          }),
          { maxLength: 80 },
        ),
        (events) => {
          const cues = toCues(events);
          expect(cues.length).toBeLessThanOrEqual(MAX_CUE_QUEUE);
        },
      ),
    );
  });
});
