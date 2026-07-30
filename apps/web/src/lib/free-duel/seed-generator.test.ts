import { describe, expect, it } from "vitest";
import { createCryptoSeedGenerator, generateDuelSessionId } from "./seed-generator.ts";

describe("crypto duel identifiers", () => {
  it("generates an unsigned 32-bit seed", () => {
    const generator = createCryptoSeedGenerator({
      getRandomValues: <T extends ArrayBufferView | null>(values: T): T => {
        (values as Uint32Array)[0] = 0xffffffff;
        return values;
      },
    });
    expect(generator()).toBe(0xffffffff);
  });

  it("generates session ids independently from the seed", () => {
    expect(
      generateDuelSessionId({
        randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
      }),
    ).toBe("123e4567-e89b-42d3-a456-426614174000");
  });

  it("does not repeat consecutive platform-generated values", () => {
    const generator = createCryptoSeedGenerator();
    expect(generator()).not.toBe(generator());
    expect(generateDuelSessionId()).not.toBe(generateDuelSessionId());
  });
});
