import {
  CardPasswordSchema,
  PASSWORD_DIGIT_COUNT,
  PASSWORD_MAX_INPUT_LENGTH,
  type NormalizedPasswordInput,
} from "@yugioh/shared";

const WHITESPACE_PATTERN = /\s/gu;
const NON_DIGIT_PATTERN = /[^0-9]/u;

export const normalizePasswordInput = (raw: string): NormalizedPasswordInput => {
  const boundedInput = raw.slice(0, PASSWORD_MAX_INPUT_LENGTH);
  const compact = boundedInput.replace(WHITESPACE_PATTERN, "");

  if (compact.length === 0) {
    return { status: "empty" };
  }

  if (NON_DIGIT_PATTERN.test(compact)) {
    return { status: "malformed", reason: "non_digit" };
  }

  if (compact.length !== PASSWORD_DIGIT_COUNT) {
    return { status: "malformed", reason: "wrong_length" };
  }

  const canonical = compact.match(/.{2}/gu)?.join(" ") ?? compact;
  if (!CardPasswordSchema.safeParse(canonical).success) {
    return { status: "malformed", reason: "wrong_length" };
  }

  return { status: "canonical", value: canonical };
};
