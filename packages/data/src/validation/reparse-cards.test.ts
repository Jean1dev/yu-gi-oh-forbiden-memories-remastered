import { describe, expect, it } from "vitest";

import { monsterCard, nonMonsterCard } from "../../tests/fixtures/validation-datasets.ts";
import { reparseCards } from "./reparse-cards.ts";

describe("reparseCards", () => {
  it("accepts a valid card without any violation", () => {
    const { cards, violations } = reparseCards([monsterCard(), nonMonsterCard()]);
    expect(cards).toHaveLength(2);
    expect(violations).toEqual([]);
  });

  it("rejects a tipo outside the five-value enum with code invalid_card_type", () => {
    const { cards, violations } = reparseCards([{ ...monsterCard(), tipo: "feitico" }]);
    expect(cards).toEqual([]);
    expect(violations).toEqual([
      {
        category: "tipo",
        numero: "001",
        code: "invalid_card_type",
        message: "Card 001: tipo 'feitico' is not allowed.",
      },
    ]);
  });

  it("rejects a guardian star outside the ten known ones", () => {
    const { violations } = reparseCards([{ ...monsterCard(), guardiao2: "Andromeda" }]);
    expect(violations).toEqual([
      {
        category: "tipo",
        numero: "001",
        code: "invalid_guardian_star",
        message: "Card 001: guardian star 'Andromeda' is not recognized.",
      },
    ]);
  });

  it("rejects a password outside the four numeric groups format", () => {
    const { violations } = reparseCards([{ ...monsterCard(), password: "8963-1139" }]);
    expect(violations).toEqual([
      {
        category: "password",
        numero: "001",
        code: "invalid_password_format",
        message: "Card 001: password '8963-1139' does not match the expected format.",
      },
    ]);
  });

  it("rejects an element that is not a valid object", () => {
    const { cards, violations } = reparseCards(["not a card"]);
    expect(cards).toEqual([]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("invalid_canonical_schema");
    expect(violations[0]?.message).toContain("Record at index 0");
  });

  it("treats a record missing tipo as a broken record, not as a forbidden tipo", () => {
    const withoutTipo: Record<string, unknown> = { ...monsterCard() };
    delete withoutTipo["tipo"];
    const { violations } = reparseCards([withoutTipo]);

    expect(violations[0]?.code).toBe("invalid_canonical_schema");
    expect(violations[0]?.message).not.toContain("undefined");
  });

  it("reports an unknown classe under the classe category", () => {
    const { violations } = reparseCards([{ ...monsterCard(), classe: "" }]);
    expect(violations[0]?.category).toBe("classe");
    expect(violations[0]?.code).toBe("invalid_canonical_schema");
  });

  it("does not stop at the first invalid element and processes the whole array", () => {
    const { cards, violations } = reparseCards([
      { ...monsterCard(), numero: "001", tipo: "feitico" },
      monsterCard({ numero: "002", id: 2 }),
      { ...monsterCard(), numero: "003", id: 3, password: "nope" },
      monsterCard({ numero: "004", id: 4 }),
    ]);

    expect(cards.map((card) => card.numero)).toEqual(["002", "004"]);
    expect(violations.map((violation) => violation.numero)).toEqual(["001", "003"]);
  });

  it("reports a dataset that is not an array as a single shape violation", () => {
    const { cards, violations } = reparseCards({ cards: [] });
    expect(cards).toEqual([]);
    expect(violations).toEqual([
      {
        category: "contagem",
        code: "invalid_dataset_shape",
        message: "Dataset is not a JSON array of cards.",
      },
    ]);
  });

  it("omits numero when the offending record has none to report", () => {
    const { violations } = reparseCards([{ nome: "orphan record" }]);
    expect(violations[0]).not.toHaveProperty("numero");
  });
});
