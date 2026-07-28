import { randomInt } from "node:crypto";

import type { RandomSource } from "@yugioh/rules";

/**
 * Production `RandomSource` (spec build-deck/F02, Decision 6): unseeded,
 * backed by `node:crypto`. Confined to `apps/web` so `packages/rules` stays
 * free of I/O and of any dependency on a specific randomness source — the
 * pure draw only ever sees the `RandomSource` interface, never this.
 */
export function createCryptoRandomSource(): RandomSource {
  return {
    nextInt(exclusiveUpperBound) {
      return randomInt(exclusiveUpperBound);
    },
  };
}
