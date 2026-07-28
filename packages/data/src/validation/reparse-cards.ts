import {
  CardNumberSchema,
  CardSchema,
  type Card,
  type CardNumber,
  type ValidationViolation,
} from "@yugioh/shared";

export type ReparseResult = Readonly<{
  /** Only the records that matched the canonical schema. */
  cards: readonly Card[];
  /** One violation per record that did not, in input order. */
  violations: readonly ValidationViolation[];
}>;

/**
 * Fields whose failure has a category of its own. Everything else falls back to
 * the generic canonical-schema violation.
 */
const GUARDIAN_FIELDS = new Set(["guardiao1", "guardiao2"]);

function culpritField(path: readonly PropertyKey[]): string | null {
  const first = path[0];
  return typeof first === "string" ? first : null;
}

/**
 * Best-effort identity of a record that failed to parse: without it the report
 * would say something is wrong without saying where.
 */
function readCardNumber(raw: unknown): CardNumber | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const parsed = CardNumberSchema.safeParse((raw as { numero?: unknown }).numero);
  return parsed.success ? parsed.data : null;
}

/**
 * Whether the record actually carries the field. A record *missing* `tipo` is a
 * broken record, not a card with a forbidden type, and the report should not
 * quote a value nobody wrote.
 */
function hasField(raw: unknown, field: string): boolean {
  return typeof raw === "object" && raw !== null && field in raw;
}

function readFieldValue(raw: unknown, field: string): string {
  if (typeof raw !== "object" || raw === null) {
    return "";
  }
  const value = (raw as Record<string, unknown>)[field];
  return typeof value === "string" ? value : String(value);
}

function subject(numero: CardNumber | null, index: number): string {
  return numero === null ? `Record at index ${String(index)}` : `Card ${numero}`;
}

function withNumero(
  violation: Omit<ValidationViolation, "numero">,
  numero: CardNumber | null,
): ValidationViolation {
  return numero === null ? violation : { ...violation, numero };
}

/**
 * Builds the violation for one record that failed `CardSchema`.
 *
 * The category set is fixed by the PRD, so a failure on a field without a
 * bucket of its own lands in `tipo` — read as "this record is not a card of a
 * valid shape" — while the code still names the actual rule.
 */
function toViolation(
  raw: unknown,
  index: number,
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): ValidationViolation {
  const numero = readCardNumber(raw);
  const fields = new Set(issues.map((issue) => culpritField(issue.path)));

  if (fields.has("tipo") && hasField(raw, "tipo")) {
    return withNumero(
      {
        category: "tipo",
        code: "invalid_card_type",
        message: `${subject(numero, index)}: tipo '${readFieldValue(raw, "tipo")}' is not allowed.`,
      },
      numero,
    );
  }

  const guardianField = [...fields].find(
    (field) => field !== null && GUARDIAN_FIELDS.has(field) && hasField(raw, field),
  );
  if (guardianField !== undefined && guardianField !== null) {
    return withNumero(
      {
        category: "tipo",
        code: "invalid_guardian_star",
        message: `${subject(numero, index)}: guardian star '${readFieldValue(raw, guardianField)}' is not recognized.`,
      },
      numero,
    );
  }

  if (fields.has("password") && hasField(raw, "password")) {
    return withNumero(
      {
        category: "password",
        code: "invalid_password_format",
        message: `${subject(numero, index)}: password '${readFieldValue(raw, "password")}' does not match the expected format.`,
      },
      numero,
    );
  }

  const details = issues
    .map((issue) => `${issue.path.map(String).join(".")} ${issue.message}`.trim())
    .join("; ");
  return withNumero(
    {
      category: fields.has("classe") ? "classe" : "tipo",
      code: "invalid_canonical_schema",
      message: `${subject(numero, index)}: record does not match the canonical schema: ${details}`,
    },
    numero,
  );
}

/**
 * Re-parses the emitted dataset against the canonical schema, from scratch.
 *
 * F02 deliberately does not trust F01's own report: `generated/` is not
 * versioned and `cards.json` can be hand-edited, so the gate only means
 * something if it re-derives the verdict from the artifact it is handed
 * (spec F02, Decision 6).
 *
 * A bad record never stops the batch: it is reported and left out of the
 * set-wide checks, so one broken card cannot hide the state of the other 721.
 */
export function reparseCards(raw: unknown): ReparseResult {
  if (!Array.isArray(raw)) {
    return {
      cards: [],
      violations: [
        {
          category: "contagem",
          code: "invalid_dataset_shape",
          message: "Dataset is not a JSON array of cards.",
        },
      ],
    };
  }

  const cards: Card[] = [];
  const violations: ValidationViolation[] = [];

  raw.forEach((element: unknown, index) => {
    const parsed = CardSchema.safeParse(element);
    if (parsed.success) {
      cards.push(parsed.data);
      return;
    }
    violations.push(toViolation(element, index, parsed.error.issues));
  });

  return { cards, violations };
}
