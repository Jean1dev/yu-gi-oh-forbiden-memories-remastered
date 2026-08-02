import type { ZoneIndex } from "@yugioh/shared";

/**
 * Returns a copy of a 5-slot zone tuple (`PlayerField["monsters"]` or
 * `PlayerField["spells"]`) with the zone at `index` replaced by `next`. Used
 * by every action that writes a single field zone (`summon`, `spells`,
 * `position`, `combat`) instead of each reimplementing the same
 * destructure-and-rebuild.
 */
export function replaceZone<T>(
  zones: readonly [T, T, T, T, T],
  index: ZoneIndex,
  next: T,
): readonly [T, T, T, T, T] {
  const [z0, z1, z2, z3, z4] = zones;
  const pick = (i: number, current: T) => (i === index ? next : current);
  return [pick(0, z0), pick(1, z1), pick(2, z2), pick(3, z3), pick(4, z4)];
}
