import type { Card, ZoneReference } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createEvent } from "./create-event.ts";

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: "89 63 11 39",
    estrelas: 999999,
    tipo: "monstro",
    ...overrides,
  };
}

describe("createEvent", () => {
  it("fills involvedCards empty when omitted", () => {
    const event = createEvent({ type: "onTurnStart", originPlayer: "P1" });
    expect(event.involvedCards).toEqual([]);
  });

  it("fills involvedZones empty when omitted", () => {
    const event = createEvent({ type: "onTurnStart", originPlayer: "P1" });
    expect(event.involvedZones).toEqual([]);
  });

  it("fills context empty when omitted", () => {
    const event = createEvent({ type: "onTurnStart", originPlayer: "P1" });
    expect(event.context).toEqual({});
  });

  it("preserves explicitly given values unchanged", () => {
    const involvedCards = [card()];
    const involvedZones: readonly ZoneReference[] = [
      { player: "P1", zoneType: "monster", index: 0 },
    ];
    const context = { damage: 1500 };

    const event = createEvent({
      type: "onAttackDeclared",
      originPlayer: "P2",
      involvedCards,
      involvedZones,
      context,
    });

    expect(event).toEqual({
      type: "onAttackDeclared",
      originPlayer: "P2",
      involvedCards,
      involvedZones,
      context,
    });
  });
});
