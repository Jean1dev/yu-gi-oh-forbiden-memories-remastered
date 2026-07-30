/**
 * Deterministic replacement for `Math.random()` (spec free-duel/F06, Decision 6):
 * the same string key always maps to the same index. No PRNG state, no I/O —
 * a pure hash of the key is the only source of "randomness".
 *
 * FNV-1a is used only for its uniform bit distribution over a 32-bit range; it
 * carries no cryptographic guarantee and none is required here (the key,
 * `duelSessionId`, is unpredictable to the player before the duel ends).
 */
function hash32(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hashToUnitInterval(key: string): number {
  return hash32(key) / 0x1_0000_0000;
}

/**
 * A deterministic index in `[0, exclusiveUpperBound)` derived from `key`.
 * `exclusiveUpperBound <= 0` (or non-finite) is a caller bug — it never
 * happens behind `selectDropCardNumber`, which only calls this with the size
 * of a non-empty candidate set — so it throws rather than returning a Result.
 */
export function deriveDeterministicIndex(key: string, exclusiveUpperBound: number): number {
  if (!Number.isFinite(exclusiveUpperBound) || exclusiveUpperBound <= 0) {
    throw new Error("exclusiveUpperBound must be a finite positive number");
  }
  const bound = Math.floor(exclusiveUpperBound);
  return hash32(key) % bound;
}

/**
 * A deterministic index into `weights`, chosen so that the observed
 * proportion of a given index, sampled over many distinct `key`s, approaches
 * `weights[i] / sum(weights)` (spec free-duel/F06, Decision 3). A non-positive
 * or non-finite weight is treated as `1` rather than rejected, so an
 * injected `CardWeightLookup` can never derail the sort (defensive per the
 * spec's error-handling table). An empty `weights` array is a caller bug —
 * never happens behind `selectDropCardNumber`, which only calls this with a
 * non-empty candidate set.
 */
export function deriveWeightedSelection(key: string, weights: readonly number[]): number {
  if (weights.length === 0) {
    throw new Error("weights must not be empty");
  }
  const sanitized = weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 1));
  const total = sanitized.reduce((sum, weight) => sum + weight, 0);
  const target = hashToUnitInterval(key) * total;

  let cumulative = 0;
  for (let i = 0; i < sanitized.length; i++) {
    cumulative += sanitized[i]!;
    if (target < cumulative) return i;
  }
  return sanitized.length - 1;
}
