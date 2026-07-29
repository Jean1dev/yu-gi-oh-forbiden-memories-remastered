import {
  CardNumberSchema,
  DifficultyLevelSchema,
  DifficultyProfileSchema,
  DomainError,
  DropPoolSchema,
  DuelistIdSchema,
  DuelistSchema,
  MAX_COPIES_PER_CARD,
  REQUIRED_DECK_SIZE,
  err,
  ok,
  type Duelist,
  type Result,
} from "@yugioh/shared";

import type { CatalogLookup } from "./types.ts";

type RawRecord = Record<string, unknown>;

function recordOf(value: unknown): RawRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RawRecord)
    : null;
}

function failure(code: string, raw: RawRecord | null, details: Record<string, unknown> = {}) {
  return err(
    new DomainError("Duelist failed roster validation.", code, {
      duelistId: typeof raw?.id === "string" ? raw.id : null,
      ...details,
    }),
  );
}

function validateShape(raw: RawRecord): Result<Duelist, DomainError> {
  if (!DuelistIdSchema.safeParse(raw.id).success) {
    return failure("invalid_duelist_id", raw);
  }
  if (typeof raw.name !== "string" || raw.name.length === 0 || raw.name.length > 60) {
    return failure("invalid_duelist_name", raw);
  }
  if (
    typeof raw.portrait !== "string" ||
    !/^[a-z0-9/_-]+\.(?:jpg|png|webp)$/.test(raw.portrait)
  ) {
    return failure("invalid_portrait", raw);
  }
  if (!DifficultyLevelSchema.safeParse(raw.difficulty).success) {
    return failure("invalid_difficulty_level", raw);
  }
  if (!DifficultyProfileSchema.safeParse(raw.profile).success) {
    return failure("invalid_difficulty_profile", raw);
  }
  if (!Array.isArray(raw.deck) || raw.deck.length !== REQUIRED_DECK_SIZE) {
    return failure("invalid_deck_size", raw, {
      expected: REQUIRED_DECK_SIZE,
      actual: Array.isArray(raw.deck) ? raw.deck.length : null,
    });
  }
  if (!raw.deck.every((cardNumber) => CardNumberSchema.safeParse(cardNumber).success)) {
    return failure("unknown_card", raw);
  }

  const copyCounts = new Map<string, number>();
  for (const cardNumber of raw.deck as string[]) {
    const copies = (copyCounts.get(cardNumber) ?? 0) + 1;
    if (copies > MAX_COPIES_PER_CARD) {
      return failure("too_many_card_copies", raw, { cardNumber, copies });
    }
    copyCounts.set(cardNumber, copies);
  }

  const rawPool = raw.dropPool ?? [];
  if (!Array.isArray(rawPool)) {
    return failure("empty_drop_tier", raw);
  }
  const tiers = new Set<string>();
  for (const entry of rawPool) {
    const tier = recordOf(entry);
    if (tier === null || typeof tier.tier !== "string") {
      return failure("empty_drop_tier", raw);
    }
    if (tiers.has(tier.tier)) {
      return failure("duplicate_drop_tier", raw, { tier: tier.tier });
    }
    tiers.add(tier.tier);
    if (!Array.isArray(tier.cardNumbers) || tier.cardNumbers.length === 0) {
      return failure("empty_drop_tier", raw, { tier: tier.tier });
    }
  }
  if (!DropPoolSchema.safeParse(rawPool).success) {
    return failure("empty_drop_tier", raw);
  }

  const parsed = DuelistSchema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : failure("invalid_roster", raw);
}

export function validateDuelist(
  raw: unknown,
  catalog: CatalogLookup,
): Result<Duelist, DomainError> {
  const record = recordOf(raw);
  if (record === null) {
    return failure("invalid_roster", null);
  }

  const shaped = validateShape(record);
  if (!shaped.ok) {
    return shaped;
  }

  for (const cardNumber of shaped.value.deck) {
    if (catalog(cardNumber) === undefined) {
      return failure("unknown_card", record, { cardNumber });
    }
  }
  for (const tier of shaped.value.dropPool) {
    for (const cardNumber of tier.cardNumbers) {
      if (catalog(cardNumber) === undefined) {
        return failure("unknown_card", record, { cardNumber, tier: tier.tier });
      }
    }
  }

  return shaped;
}
