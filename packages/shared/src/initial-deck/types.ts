import type { CardNumber } from "../card/types.ts";

/**
 * Optional, tunable configuration for the signup draw pool (spec
 * build-deck/F02 §3). `numbers` absent or empty means "no configuration yet":
 * the resolver falls back to the whole catalog (Decision 7) instead of
 * inventing a balancing list. `version` exists for traceability
 * (`docs/arquitetura.md` §4.1) once a real configuration is versioned.
 */
export type InitialPoolConfig = Readonly<{
  version: string;
  numbers?: readonly CardNumber[] | undefined;
}>;
