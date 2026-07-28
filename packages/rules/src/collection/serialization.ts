import {
  DomainError,
  err,
  ok,
  SerializedCollectionSchema,
  type Collection,
  type Result,
  type SerializedCollection,
} from "@yugioh/shared";

/**
 * Converts the in-memory `Collection` to its JSON-serializable transport
 * shape. Entries are inserted in ascending card-number order, which is
 * meaningful for the ~100 numbers below "100" (JS keeps insertion order for
 * non-array-index string keys) but not for the rest: any numeric string
 * without a leading zero ("100".."722") is an array-index key by the ECMA-262
 * `[[OwnPropertyKeys]]` rule, and those always enumerate in ascending numeric
 * order ahead of every other key, regardless of insertion order. No plain
 * object can express full lexicographic order across "001".."722" — nothing
 * downstream depends on it, since every consumer that needs order
 * ({@link ownedEntries}, `enrichCollection`) sorts explicitly at the
 * `Map`/array level instead of relying on object key enumeration.
 *
 * Round-trip inverse of {@link deserializeCollection}.
 */
export function serializeCollection(collection: Collection): SerializedCollection {
  const sortedCardNumbers = [...collection.keys()].sort();
  const entries = sortedCardNumbers.map(
    (cardNumber) => [cardNumber, collection.get(cardNumber) as number] as const,
  );
  return Object.freeze(Object.fromEntries(entries));
}

/**
 * Converts the transport shape back to a `Collection`. Re-validates every
 * entry rather than trusting the caller's static type — the same rule
 * applied to any other boundary crossing (guidelines §18.3): the value came
 * from JSON (network or IndexedDB) before it was typed as `SerializedCollection`.
 */
export function deserializeCollection(raw: SerializedCollection): Result<Collection, DomainError> {
  const parsed = SerializedCollectionSchema.safeParse(raw);
  if (!parsed.success) {
    return err(
      new DomainError(
        "Collection entry failed validation: cardNumber must be a 3-digit number and quantity a non-negative integer.",
        "invalid_collection_row",
        { issues: parsed.error.issues },
      ),
    );
  }
  return ok(new Map(Object.entries(parsed.data)));
}
