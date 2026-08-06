/**
 * Mulberry32, the same 32-bit PRNG the duel engine seeds its shuffles with.
 *
 * It is duplicated here rather than imported because `data` sits upstream of
 * `engine` in the dependency graph (`docs/arquitetura.md` §3) and may never
 * import it. Two callers inside this package already needed it — the roster
 * builder and the test-duelist generator — so it lives in one module instead
 * of being copy-pasted per script.
 */
export function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
