import { DomainError, err, ok, type Result } from "@yugioh/shared";

import { DropTableFileSchema } from "./schema.ts";
import type { DropPool } from "./types.ts";

/**
 * Validates the whole raw array from `drop-tables.json` against
 * `DropTableFileSchema` in a single pass and cites only the first structural
 * problem found (spec F08 §6: "citando o primeiro problema estrutural") —
 * unlike `validateDropReferences`, which accumulates every violation, this
 * step fails fast because a malformed entry means the file itself cannot be
 * trusted to iterate over.
 *
 * An empty array is a valid instance of the schema, not a failure (spec F08,
 * Decision 3/7): it is the expected shape while the real drop pools remain
 * pending external data.
 */
export function validateDropTableSchema(bruto: unknown): Result<readonly DropPool[], DomainError> {
  const parsed = DropTableFileSchema.safeParse(bruto);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail =
      issue === undefined
        ? "unknown validation error"
        : `${issue.path.map(String).join(".")} ${issue.message}`.trim();
    return err(
      new DomainError(`Tabela de drops invalida: ${detail}.`, "schema_tabela_drops_invalido", {
        detail,
      }),
    );
  }

  return ok(Object.freeze(parsed.data.map((pool) => Object.freeze(pool))));
}
