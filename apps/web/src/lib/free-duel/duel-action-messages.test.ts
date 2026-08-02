import { DomainError } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { getRefusalMessage, KNOWN_REFUSAL_CODES } from "./duel-action-messages.ts";

describe("duel action messages", () => {
  it("translates every known engine code", () => {
    for (const code of KNOWN_REFUSAL_CODES) {
      expect(getRefusalMessage(new DomainError("engine text", code))).not.toBe("engine text");
      expect(getRefusalMessage(new DomainError("engine text", code))).not.toMatch(/^Nao foi possivel/);
    }
  });

  it("uses a generic fallback for unknown codes", () => {
    expect(getRefusalMessage(new DomainError("secret engine text", "new_code"))).toBe(
      "Nao foi possivel fazer essa jogada agora.",
    );
  });

  it("never leaks the original engine message", () => {
    const error = new DomainError("Only cards of type monstro can occupy a monster zone.", "unsummonable_card_type");
    expect(getRefusalMessage(error)).not.toBe(error.message);
  });
});
