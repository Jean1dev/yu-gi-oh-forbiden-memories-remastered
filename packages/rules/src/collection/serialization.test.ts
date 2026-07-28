import type { Collection, SerializedCollection } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { deserializeCollection, serializeCollection } from "./serialization.ts";

describe("serializeCollection", () => {
  it("emits keys in ascending card-number order for numbers below 100", () => {
    // Below "100", every card number has a leading zero and so is not an
    // array-index key (ECMA-262 [[OwnPropertyKeys]]) — insertion order is
    // preserved and observable here. See the caveat on serializeCollection
    // for numbers "100" and above.
    const collection: Collection = new Map([
      ["045", 5],
      ["001", 3],
      ["033", 1],
    ]);
    expect(Object.keys(serializeCollection(collection))).toEqual(["001", "033", "045"]);
  });

  it("preserves every entry's value regardless of key enumeration order", () => {
    const collection: Collection = new Map([
      ["333", 5],
      ["001", 3],
      ["045", 1],
    ]);
    expect(serializeCollection(collection)).toEqual({ "001": 3, "045": 1, "333": 5 });
  });
});

describe("deserializeCollection", () => {
  it("rejects a negative quantity with code invalid_collection_row", () => {
    const raw = { "001": -1 } as unknown as SerializedCollection;
    const result = deserializeCollection(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_collection_row");
  });

  it("rejects a card number outside the three-digit format", () => {
    const raw = { "1": 3 } as unknown as SerializedCollection;
    const result = deserializeCollection(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_collection_row");
  });

  it("accepts a well-formed serialized collection", () => {
    const raw: SerializedCollection = { "001": 3, "045": 1 };
    const result = deserializeCollection(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.get("001")).toBe(3);
    expect(result.value.get("045")).toBe(1);
  });
});
