import {
  CARD_NUMBER_LENGTH,
  CardSchema,
  DomainError,
  err,
  ok,
  type Card,
  type CardNumber,
  type Result,
} from "@yugioh/shared";

import type { SourceCard } from "./envelope.ts";

/** Source sentinel meaning "this card has no typeable password". */
const NO_PASSWORD_SENTINEL = "Indisponível";

const INTEGER_PATTERN = /^[0-9]+$/;

/**
 * Coerces a numeric field from the source. The source delivers everything as a
 * string and signals absence with an empty string.
 *
 * `""` becomes `null` ("absent by design"), while `"0"` becomes `0` — the
 * distinction matters: a monster with 0 ATK is not the same as a trap with no
 * ATK at all. Anything else is an error, never a silent zero.
 */
function coerceInteger(
  value: string,
  field: string,
  file: string,
): Result<number | null, DomainError> {
  if (value === "") {
    return ok(null);
  }
  if (!INTEGER_PATTERN.test(value)) {
    return err(
      new DomainError(`${field} '${value}' is not an integer`, "invalid_numeric_field", {
        file,
        field,
        value,
      }),
    );
  }
  return ok(Number(value));
}

/** `""` in the source means "no Guardian Star", not a guardian with an empty name. */
function coerceGuardianStar(value: string): string | null {
  return value === "" ? null : value;
}

/** Pads to 3 digits: this is what turns `numero` into a stable collection key. */
export function normalizeCardNumber(value: string): CardNumber {
  return value.padStart(CARD_NUMBER_LENGTH, "0");
}

/** Derives the expected `numero` from the file name: `01.json` -> `001`. */
export function cardNumberFromFileName(file: string): CardNumber {
  return normalizeCardNumber(file.replace(/\.json$/i, ""));
}

/**
 * Raw source record -> canonical card.
 *
 * A failure returns a `DomainError` whose code names the offending field; the
 * batch carries on and the discard is recorded in the report (spec F01,
 * Decision 10).
 */
export function normalizeCard(source: SourceCard, file: string): Result<Card, DomainError> {
  const numero = normalizeCardNumber(source.numero);
  const expectedNumero = cardNumberFromFileName(file);
  if (numero !== expectedNumero) {
    return err(
      new DomainError(
        `numero '${numero}' does not match file '${file}'`,
        "card_number_file_mismatch",
        { file, numero, expectedNumero },
      ),
    );
  }

  const atk = coerceInteger(source.atk, "atk", file);
  if (!atk.ok) {
    return atk;
  }
  const def = coerceInteger(source.def, "def", file);
  if (!def.ok) {
    return def;
  }
  const estrelas = coerceInteger(source.estrelas, "estrelas", file);
  if (!estrelas.ok) {
    return estrelas;
  }

  const candidate = {
    id: source.id,
    numero,
    nome: source.nome,
    img: source.img,
    classe: source.classe,
    atk: atk.value,
    def: def.value,
    guardiao1: coerceGuardianStar(source.guardiao1),
    guardiao2: coerceGuardianStar(source.guardiao2),
    password: source.password === NO_PASSWORD_SENTINEL ? null : source.password,
    estrelas: estrelas.value,
    tipo: source.tipo,
  };

  const validated = CardSchema.safeParse(candidate);
  if (!validated.success) {
    const details = validated.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ");
    return err(
      new DomainError(
        `record does not match the canonical schema: ${details}`,
        "invalid_canonical_schema",
        { file, numero },
      ),
    );
  }

  return ok(validated.data);
}
