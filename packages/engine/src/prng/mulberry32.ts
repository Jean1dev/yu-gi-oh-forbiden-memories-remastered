/**
 * The engine's one seeded PRNG (`docs/arquitetura.md` §3.1, "PRNG semeado
 * próprio (ex.: mulberry32)"). Every call advances the closed-over state and
 * returns the next float in `[0, 1)`; the same seed always reproduces the
 * same sequence of calls (motor-duelo-1x1 F03, determinism pillar).
 */
export function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
