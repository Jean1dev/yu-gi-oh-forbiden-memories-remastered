import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { sourceCard } from "../../tests/fixtures/source-records.ts";
import { normalizeCard } from "./normalize-card.ts";

function normalizeOrThrow(overrides: Parameters<typeof sourceCard>[0], file = "001.json") {
  const result = normalizeCard(sourceCard(overrides), file);
  if (!result.ok) {
    throw new Error(`expected a valid card, got ${result.error.code}: ${result.error.message}`);
  }
  return result.value;
}

const numericCases = [
  { name: "converts a numeric atk into an integer", field: "atk", input: "3000", expected: 3000 },
  { name: "converts an empty atk into null", field: "atk", input: "", expected: null },
  { name: "converts a zero atk into zero, not null", field: "atk", input: "0", expected: 0 },
  { name: "converts def with the same rule as atk", field: "def", input: "2500", expected: 2500 },
  { name: "converts an empty def into null", field: "def", input: "", expected: null },
  {
    name: "converts estrelas with the same rule as atk",
    field: "estrelas",
    input: "10",
    expected: 10,
  },
  { name: "converts an empty estrelas into null", field: "estrelas", input: "", expected: null },
] as const;

describe("normalizeCard numeric coercion", () => {
  for (const testCase of numericCases) {
    it(testCase.name, () => {
      const card = normalizeOrThrow({ [testCase.field]: testCase.input });
      expect(card[testCase.field]).toBe(testCase.expected);
    });
  }

  it("rejects a non-numeric atk with code invalid_numeric_field", () => {
    const result = normalizeCard(sourceCard({ atk: "N/A" }), "001.json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_numeric_field");
    expect(result.error.details).toMatchObject({ field: "atk", value: "N/A" });
  });

  it("coerces every integer in the source range without loss", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999999 }), (value) => {
        const card = normalizeOrThrow({ atk: String(value) });
        return card.atk === value;
      }),
      { numRuns: 1000 },
    );
  });
});

describe("normalizeCard absence sentinels", () => {
  it("converts the Indisponível password into null", () => {
    expect(normalizeOrThrow({ password: "Indisponível" }).password).toBeNull();
  });

  it("preserves a password of four numeric groups", () => {
    expect(normalizeOrThrow({ password: "89 63 11 39" }).password).toBe("89 63 11 39");
  });

  it("converts empty guardian stars into null", () => {
    const card = normalizeOrThrow({ guardiao1: "", guardiao2: "" });
    expect(card.guardiao1).toBeNull();
    expect(card.guardiao2).toBeNull();
  });

  it("preserves both guardian stars of a monster", () => {
    const card = normalizeOrThrow({ guardiao1: "Neptune", guardiao2: "Venus" });
    expect(card.guardiao1).toBe("Neptune");
    expect(card.guardiao2).toBe("Venus");
  });

  it("keeps img as null", () => {
    expect(normalizeOrThrow({}).img).toBeNull();
  });
});

describe("normalizeCard verbatim preservation", () => {
  it("preserves ritual as the fifth card type", () => {
    expect(normalizeOrThrow({ tipo: "ritual" }).tipo).toBe("ritual");
  });

  it("preserves the compound class Sea Serpent without touching its space", () => {
    expect(normalizeOrThrow({ classe: "Sea Serpent" }).classe).toBe("Sea Serpent");
  });

  it("preserves punctuation and casing in the card name", () => {
    expect(normalizeOrThrow({ nome: "Blue-eyes White Dragon" }).nome).toBe(
      "Blue-eyes White Dragon",
    );
  });

  it("pads a short numero to three digits", () => {
    expect(normalizeOrThrow({ numero: "1" }).numero).toBe("001");
  });
});

describe("normalizeCard schema rejection", () => {
  it("rejects a type outside the five-value enum", () => {
    const result = normalizeCard(sourceCard({ tipo: "feitico" }), "001.json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_canonical_schema");
  });

  it("rejects a guardian star outside the ten known ones", () => {
    const result = normalizeCard(sourceCard({ guardiao1: "Ganymede" }), "001.json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_canonical_schema");
  });

  it("rejects a numero outside the three-digit range", () => {
    const result = normalizeCard(sourceCard({ numero: "1234" }), "1234.json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_canonical_schema");
  });

  it("rejects a numero that does not match the file name", () => {
    const result = normalizeCard(sourceCard({ numero: "002" }), "001.json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("card_number_file_mismatch");
  });
});
