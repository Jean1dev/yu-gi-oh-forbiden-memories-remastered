/**
 * Normalizes an unordered pair of `numero` or `classe` values into a stable
 * key: `canonicalizePair(a, b) === canonicalizePair(b, a)` for any pair
 * (spec F05, Decision 5) — choosing two materials to fuse has no order in the
 * original game.
 *
 * Encoded as a JSON array rather than a delimited string: `classe` is a free
 * string that can itself contain a space (e.g. "Sea Serpent"), so a naive
 * join could collide two distinct pairs onto the same key. `JSON.stringify`
 * of a two-element string array is unambiguous for any pair of inputs.
 */
export function canonicalizePair(a: string, b: string): string {
  const [first, second] = [a, b].sort((left, right) => left.localeCompare(right));
  return JSON.stringify([first, second]);
}
