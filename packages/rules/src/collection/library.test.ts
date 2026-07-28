import type { Collection } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { deriveOwnedCardNumbers } from "./library.ts";

describe("deriveOwnedCardNumbers", () => {
  it("includes only card numbers with quantity greater than or equal to one", () => {
    const collection: Collection = new Map([
      ["001", 3],
      ["045", 1],
    ]);
    expect(deriveOwnedCardNumbers(collection)).toEqual(new Set(["001", "045"]));
  });

  it("excludes a card number with quantity zero", () => {
    const collection: Collection = new Map([
      ["001", 3],
      ["999", 0],
    ]);
    expect(deriveOwnedCardNumbers(collection).has("999")).toBe(false);
  });
});
