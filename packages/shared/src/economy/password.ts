import type { Card } from "../card/types.ts";

export type NormalizedPasswordInput =
  | Readonly<{ status: "canonical"; value: string }>
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "malformed"; reason: "non_digit" | "wrong_length" }>;

export type CardPrice = Readonly<{
  stars: number;
  source: "catalog" | "fallback";
}>;

export type PasswordAffordability =
  | Readonly<{ status: "affordable"; balanceStars: number }>
  | Readonly<{ status: "insufficient"; balanceStars: number; missingStars: number }>
  | Readonly<{ status: "unknown" }>;

export type PasswordResolution =
  | Readonly<{
      status: "resolved";
      card: Card;
      price: CardPrice;
      affordability: PasswordAffordability;
    }>
  | Readonly<{ status: "invalid_format"; reason: "non_digit" | "wrong_length" }>
  | Readonly<{ status: "not_found"; canonicalPassword: string }>;

export type PasswordCardLookup = (canonicalPassword: string) => Card | undefined;
