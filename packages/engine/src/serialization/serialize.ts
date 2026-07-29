import type { DuelState, Snapshot } from "@yugioh/shared";

/**
 * Captures a snapshot of `state`: a structurally identical copy sharing no
 * reference with the live state, so neither side is affected by a later
 * mutation of the other (motor-duelo-1x1/F05, spec Decision 3). Total:
 * `state` is always produced by the engine itself (F03 `initDuel`, or a
 * future F06–F12 `apply`), never an untrusted boundary, so there is no
 * failure path here — that belongs to `load`.
 */
export function serialize(state: DuelState): Snapshot {
  return structuredClone(state);
}
