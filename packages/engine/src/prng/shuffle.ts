/** Reads `list[index]`, narrowing away `undefined` (guidelines §6.3: throw over `!`). */
function at<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) {
    throw new Error(`shuffle: index ${String(index)} out of bounds`);
  }
  return value;
}

/**
 * Fisher-Yates shuffle, driven entirely by `next` — never `Math.random()`
 * (`docs/arquitetura.md` §3.1). Does not mutate `list`; returns a new array of
 * the same length holding a permutation of the same elements.
 */
export function shuffle<T>(list: readonly T[], next: () => number): readonly T[] {
  const result = [...list];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const temp = at(result, i);
    result[i] = at(result, j);
    result[j] = temp;
  }

  return result;
}
