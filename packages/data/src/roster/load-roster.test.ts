import { describe, expect, it } from "vitest";

import { loadRoster } from "./load-roster.ts";
import { catalog, duelist } from "./validate-duelist.test.ts";

describe("loadRoster", () => {
  it("accepts an empty roster", () => {
    const result = loadRoster({ rosterVersion: "0.0.0", duelists: [] }, catalog);
    expect(result).toMatchObject({
      ok: true,
      value: { duelists: [], report: { valid: true, declaredDuelists: 0 } },
    });
  });

  it.each([null, "not-json", { rosterVersion: "bad", duelists: [] }])(
    "returns invalid_roster for an invalid envelope",
    (raw) => {
      const result = loadRoster(raw, catalog);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("invalid_roster");
    },
  );

  it("hides invalid and duplicate duelists while preserving valid order", () => {
    const result = loadRoster(
      {
        rosterVersion: "1.0.0",
        duelists: [
          duelist({ id: "first", name: "First" }),
          duelist({ id: "broken", deck: [] }),
          duelist({ id: "second", name: "Second", dropPool: [{ tier: "rare", cardNumbers: ["001"] }] }),
          duelist({ id: "first", name: "Duplicate" }),
        ],
      },
      catalog,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.duelists.map(({ id }) => id)).toEqual(["first", "second"]);
    expect(result.value.report.hidden.map(({ code }) => code)).toEqual([
      "invalid_deck_size",
      "duplicate_duelist_id",
    ]);
    expect(result.value.report.observedDropTiers).toEqual(["rare"]);
    expect(result.value.report.valid).toBe(false);
  });

  it("records an unresolved portrait without hiding its duelist", () => {
    const result = loadRoster(
      { rosterVersion: "1.0.0", duelists: [duelist()] },
      catalog,
      () => false,
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        duelists: [{ id: "duelist-one" }],
        report: { missingPortraits: ["duelists/one.webp"], valid: true },
      },
    });
  });
});
