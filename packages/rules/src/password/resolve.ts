import type { PasswordCardLookup, PasswordResolution } from "@yugioh/shared";

import { evaluateAffordability } from "./affordability.ts";
import { normalizePasswordInput } from "./normalize.ts";
import { resolveCardPrice } from "./pricing.ts";

export type ResolvePasswordEntryInput = Readonly<{
  rawInput: string;
  lookup: PasswordCardLookup;
  balanceStars: number | undefined;
}>;

export const resolvePasswordEntry = ({
  rawInput,
  lookup,
  balanceStars,
}: ResolvePasswordEntryInput): PasswordResolution => {
  const normalized = normalizePasswordInput(rawInput);
  if (normalized.status !== "canonical") {
    return {
      status: "invalid_format",
      reason: normalized.status === "malformed" ? normalized.reason : "wrong_length",
    };
  }

  const card = lookup(normalized.value);
  if (card === undefined) {
    return { status: "not_found", canonicalPassword: normalized.value };
  }

  const price = resolveCardPrice(card);
  return {
    status: "resolved",
    card,
    price,
    affordability: evaluateAffordability(price, balanceStars),
  };
};
