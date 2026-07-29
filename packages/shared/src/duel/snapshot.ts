import type { DuelState } from "./types.ts";

/**
 * A `DuelState` ready to be stored or transmitted. Not a wrapper: the state
 * itself, already 100% JSON-serializable by construction (F01 Decision 15),
 * is the snapshot — `docs/arquitetura.md` §3.1, "Snapshot = o próprio estado
 * serializado" (motor-duelo-1x1/F05, spec Decision 1).
 */
export type Snapshot = DuelState;
