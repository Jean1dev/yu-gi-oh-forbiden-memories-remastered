import { describe, expect, it } from "vitest";

import { unavailableActiveDeck } from "./unavailable-active-deck.ts";

describe("unavailableActiveDeck", () => {
  it("returns zero for any card number", () => {
    const lookup = unavailableActiveDeck();
    expect(lookup("001")).toBe(0);
    expect(lookup("722")).toBe(0);
  });
});
