import { describe, expect, it } from "vitest";

import { getDropPool, getDuelist, listCardNumbersForTier } from "./drop-pool.ts";
import { loadRoster } from "./load-roster.ts";
import { catalog, duelist } from "./validate-duelist.test.ts";

const loaded = loadRoster(
  {
    rosterVersion: "1.0.0",
    duelists: [duelist({ dropPool: [{ tier: "rare", cardNumbers: ["001", "002"] }] })],
  },
  catalog,
);
if (!loaded.ok) throw loaded.error;

describe("roster queries", () => {
  it("returns unknown_duelist for an absent id", () => {
    const result = getDuelist(loaded.value, "missing");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unknown_duelist");
  });

  it("returns the declared pool", () => {
    expect(getDropPool(loaded.value, "duelist-one")).toMatchObject({
      ok: true,
      value: [{ tier: "rare", cardNumbers: ["001", "002"] }],
    });
  });

  it("returns candidates in declaration order and an empty unknown tier", () => {
    expect(listCardNumbersForTier(loaded.value.duelists[0]!.dropPool, "rare")).toEqual([
      "001",
      "002",
    ]);
    expect(listCardNumbersForTier(loaded.value.duelists[0]!.dropPool, "missing")).toEqual([]);
  });
});
