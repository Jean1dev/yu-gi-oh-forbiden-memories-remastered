import { describe, expect, it } from "vitest";

import { monsterCard } from "../../tests/fixtures/validation-datasets.ts";
import {
  PASSWORD_INVALID_FORMAT,
  PASSWORD_NOT_FOUND,
  passwordFound,
  type PasswordLookupResult,
} from "./types.ts";

/**
 * Consumer-side reading of the union. There is deliberately no `default` and no
 * trailing `return`: the declared `string` return type only holds while the
 * switch covers every arm, so adding an outcome to the union breaks the
 * typecheck here instead of silently reaching consumers unhandled.
 */
function describeLookup(result: PasswordLookupResult): string {
  if (result.found) {
    return `card ${result.card.numero}`;
  }
  switch (result.reason) {
    case "invalid_format":
      return "not a password";
    case "not_found":
      return "no such password";
  }
}

describe("PasswordLookupResult", () => {
  it("narrows to the card on the found arm", () => {
    const card = monsterCard({ password: "89 63 11 39" });

    const result = passwordFound(card);

    expect(result.found).toBe(true);
    expect(describeLookup(result)).toBe("card 001");
  });

  it("keeps a malformed password apart from an unknown one", () => {
    expect(describeLookup(PASSWORD_INVALID_FORMAT)).toBe("not a password");
    expect(describeLookup(PASSWORD_NOT_FOUND)).toBe("no such password");
  });

  it("carries a reason on every negative outcome", () => {
    for (const result of [PASSWORD_INVALID_FORMAT, PASSWORD_NOT_FOUND]) {
      expect(result.found).toBe(false);
      expect(result).toHaveProperty("reason");
    }
  });

  it("freezes each outcome so a consumer cannot rewrite the verdict", () => {
    const results = [passwordFound(monsterCard()), PASSWORD_NOT_FOUND, PASSWORD_INVALID_FORMAT];

    for (const result of results) {
      expect(Object.isFrozen(result)).toBe(true);
      expect(() => {
        (result as { found: boolean }).found = true;
      }).toThrow(TypeError);
    }
  });
});
