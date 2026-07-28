import { KNOWN_CLASSES } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { monsterCard, toCardNumber } from "../../tests/fixtures/validation-datasets.ts";
import { checkKnownClass } from "./check-known-class.ts";

describe("checkKnownClass", () => {
  it("reports no violation for the 24 known classes", () => {
    const cards = KNOWN_CLASSES.map((classe, index) =>
      monsterCard({ id: index + 1, numero: toCardNumber(index + 1), classe }),
    );

    expect(checkKnownClass(cards)).toEqual({ violations: [], unknownClasses: [] });
  });

  it("reports the violation and lists the class in unknownClasses", () => {
    const result = checkKnownClass([monsterCard({ classe: "Draggon" })]);

    expect(result.violations).toEqual([
      {
        category: "classe",
        numero: "001",
        code: "unknown_class",
        message: "Card 001: classe 'Draggon' is outside the known set.",
      },
    ]);
    expect(result.unknownClasses).toEqual(["Draggon"]);
  });

  it("lists each unknown class once and sorted, even across several cards", () => {
    const result = checkKnownClass([
      monsterCard({ numero: "001", id: 1, classe: "Zebra" }),
      monsterCard({ numero: "002", id: 2, classe: "Alien" }),
      monsterCard({ numero: "003", id: 3, classe: "Zebra" }),
      monsterCard({ numero: "004", id: 4, classe: "Dragon" }),
    ]);

    expect(result.unknownClasses).toEqual(["Alien", "Zebra"]);
    expect(result.violations.map((violation) => violation.numero)).toEqual(["001", "002", "003"]);
  });
});
