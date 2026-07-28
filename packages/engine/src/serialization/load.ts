import { DomainError, DuelStateSchema, err, ok, type DuelState, type Result } from "@yugioh/shared";

/**
 * Reconstructs a `DuelState` from a `snapshot` of untrusted origin — disk,
 * network, or a hand-built object in a test (motor-duelo-1x1/F05, spec
 * Decision 4: `unknown` in, never `Snapshot`). Validates the full shape
 * against `DuelStateSchema` — the same schema `DuelState` is defined by, no
 * schema duplicated here — before returning an independently cloned copy, so
 * the caller never ends up aliasing `snapshot`. Total: never throws; a
 * malformed value comes back as an `err` instead.
 */
export function load(snapshot: unknown): Result<DuelState, DomainError> {
  const parsed = DuelStateSchema.safeParse(snapshot);
  if (!parsed.success) {
    return err(
      new DomainError("Snapshot failed validation against the duel state schema.", "invalid_snapshot", {
        issues: parsed.error.issues,
      }),
    );
  }
  return ok(structuredClone(parsed.data));
}
