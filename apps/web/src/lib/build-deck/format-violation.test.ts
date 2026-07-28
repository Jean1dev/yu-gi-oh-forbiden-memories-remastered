import type { DeckDraftViolation } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { formatViolation } from "./format-violation.ts";

const noName = (): undefined => undefined;

describe("formatViolation", () => {
  it("formats insufficient_total with the missing count interpolated", () => {
    const violation: DeckDraftViolation = { type: "insufficient_total", missing: 3 };
    expect(formatViolation(violation, noName)).toBe("Faltam 3 cartas para 40");
  });

  it("formats excessive_total with the excess count interpolated", () => {
    const violation: DeckDraftViolation = { type: "excessive_total", excess: 2 };
    expect(formatViolation(violation, noName)).toBe("Excedem 2 cartas acima de 40");
  });

  it("formats copy_limit_exceeded with the resolved card name and quantity interpolated", () => {
    const violation: DeckDraftViolation = {
      type: "copy_limit_exceeded",
      cardNumber: "045",
      quantityInDraft: 4,
    };
    expect(formatViolation(violation, () => "Dark Magician")).toBe("Dark Magician: 4 cópias (máx. 3)");
  });

  it("formats exceeds_owned_quantity with the resolved card name and owned quantity interpolated", () => {
    const violation: DeckDraftViolation = {
      type: "exceeds_owned_quantity",
      cardNumber: "333",
      quantityInDraft: 3,
      quantityOwned: 2,
    };
    expect(formatViolation(violation, () => "Blue-eyes White Dragon")).toBe(
      "Blue-eyes White Dragon: além do que possui (2)",
    );
  });

  it("falls back to the card number when findCardName does not know it", () => {
    const violation: DeckDraftViolation = {
      type: "copy_limit_exceeded",
      cardNumber: "045",
      quantityInDraft: 4,
    };
    expect(formatViolation(violation, noName)).toBe("045: 4 cópias (máx. 3)");
  });
});
