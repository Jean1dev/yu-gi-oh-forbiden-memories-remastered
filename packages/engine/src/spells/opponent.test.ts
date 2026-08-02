import { describe, expect, it } from "vitest";

import { getOpponent } from "./opponent.ts";

describe("getOpponent", () => {
  it("devolve P2 quando o jogador é P1", () => {
    expect(getOpponent("P1")).toBe("P2");
  });

  it("devolve P1 quando o jogador é P2", () => {
    expect(getOpponent("P2")).toBe("P1");
  });
});
