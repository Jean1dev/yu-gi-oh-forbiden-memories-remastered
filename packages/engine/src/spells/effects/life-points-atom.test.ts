import { getSpellEffect, type SpellEffect } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { firstLifePointsAtom, rewriteFirstLifePointsAtom } from "./life-points-atom.ts";

const burn: SpellEffect = { type: "life_points", side: "opponent", delta: -500 };
const heal: SpellEffect = { type: "life_points", side: "caster", delta: 5000 };

/** A composed card is not in the table yet; this is the shape one would take. */
const composed: SpellEffect = {
  type: "sequence",
  effects: [
    { type: "reveal_face_down", targets: { side: "opponent", filter: { kind: "any" } } },
    { type: "life_points", side: "opponent", delta: -700 },
    { type: "attack_lock", side: "opponent", turns: 3 },
  ],
};

describe("firstLifePointsAtom", () => {
  it("devolve o proprio efeito quando ele ja e atomico", () => {
    expect(firstLifePointsAtom(burn)).toBe(burn);
    expect(firstLifePointsAtom(heal)).toBe(heal);
  });

  it("encontra o atomo dentro de uma sequence", () => {
    expect(firstLifePointsAtom(composed)).toEqual({
      type: "life_points",
      side: "opponent",
      delta: -700,
    });
  });

  it("devolve undefined para efeitos sem passo de life points", () => {
    expect(firstLifePointsAtom({ type: "terrain" })).toBeUndefined();
    // 348 Swords of Revealing Light: a unica sequence real, e sem life points.
    const swords = getSpellEffect("348");
    expect(swords?.type).toBe("sequence");
    expect(swords === undefined ? undefined : firstLifePointsAtom(swords)).toBeUndefined();
  });
});

describe("rewriteFirstLifePointsAtom", () => {
  it("reescreve o efeito atomico", () => {
    expect(rewriteFirstLifePointsAtom(burn, (atom) => ({ ...atom, side: "caster" }))).toEqual({
      type: "life_points",
      side: "caster",
      delta: -500,
    });
  });

  it("reescreve so o atomo de life points e preserva os demais passos", () => {
    expect(
      rewriteFirstLifePointsAtom(composed, (atom) => ({ ...atom, delta: -atom.delta })),
    ).toEqual({
      type: "sequence",
      effects: [
        { type: "reveal_face_down", targets: { side: "opponent", filter: { kind: "any" } } },
        { type: "life_points", side: "opponent", delta: 700 },
        { type: "attack_lock", side: "opponent", turns: 3 },
      ],
    });
  });

  it("reescreve apenas o primeiro atomo quando ha mais de um", () => {
    const twoSteps: SpellEffect = {
      type: "sequence",
      effects: [
        { type: "life_points", side: "opponent", delta: -100 },
        { type: "life_points", side: "caster", delta: 200 },
      ],
    };

    expect(rewriteFirstLifePointsAtom(twoSteps, (atom) => ({ ...atom, delta: 0 }))).toEqual({
      type: "sequence",
      effects: [
        { type: "life_points", side: "opponent", delta: 0 },
        { type: "life_points", side: "caster", delta: 200 },
      ],
    });
  });

  it("nao altera um efeito sem passo de life points", () => {
    const terrain: SpellEffect = { type: "terrain" };

    expect(rewriteFirstLifePointsAtom(terrain, (atom) => ({ ...atom, delta: 1 }))).toBe(terrain);
  });
});
