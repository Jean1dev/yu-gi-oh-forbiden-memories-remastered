import type { AtomicSpellEffect, SpellEffect } from "@yugioh/shared";

export type LifePointsEffect = Extract<AtomicSpellEffect, { type: "life_points" }>;

/**
 * The first life-point step a card will resolve, `sequence` included
 * (`docs/traps/spell-reactions.md`).
 *
 * 687 Goblin Fan and 688 Bad Reaction to Simochi react to the *effect*, not to
 * the card's shape, so a composed card carrying a life-point atom has to be
 * interceptable exactly like a bare one. No shipped card is that today — 348
 * Swords of Revealing Light is the only `sequence` and it holds no life-point
 * atom — but reading only the top level would let the next composed card walk
 * past both traps with nothing to catch it.
 */
export function firstLifePointsAtom(effect: SpellEffect): LifePointsEffect | undefined {
  if (effect.type === "life_points") return effect;
  if (effect.type !== "sequence") return undefined;
  return effect.effects.find((atom) => atom.type === "life_points");
}

/**
 * Replaces the atom {@link firstLifePointsAtom} found, leaving every other step
 * of the sequence exactly as it was. Only the first is rewritten, so the atom a
 * trap was matched against is the atom that changes.
 */
export function rewriteFirstLifePointsAtom(
  effect: SpellEffect,
  rewrite: (atom: LifePointsEffect) => LifePointsEffect,
): SpellEffect {
  if (effect.type === "life_points") return rewrite(effect);
  if (effect.type !== "sequence") return effect;
  let rewritten = false;
  return {
    ...effect,
    effects: effect.effects.map((atom) => {
      if (rewritten || atom.type !== "life_points") return atom;
      rewritten = true;
      return rewrite(atom);
    }),
  };
}
