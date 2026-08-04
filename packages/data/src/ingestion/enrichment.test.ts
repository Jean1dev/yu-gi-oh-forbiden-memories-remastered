import type { Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { monsterCard, nonMonsterCard } from "../../tests/fixtures/validation-datasets.ts";
import { applyEnrichment, type CardEnrichmentTable } from "./enrichment.ts";

describe("applyEnrichment", () => {
  it("merges atributo/nivel/descricao when an entry exists for the numero", () => {
    const card: Card = monsterCard({ numero: "001" });
    const table: CardEnrichmentTable = {
      "001": { atributo: "LIGHT", nivel: 8, descricao: "A powerful dragon." },
    };

    const result = applyEnrichment(card, table);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      atributo: "LIGHT",
      nivel: 8,
      descricao: "A powerful dragon.",
    });
  });

  it("returns the original card unchanged when no entry exists for the numero", () => {
    const card: Card = monsterCard({ numero: "001" });

    const result = applyEnrichment(card, {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(card);
  });

  it("discards the merge and reports an error when the result violates the schema", () => {
    const card: Card = nonMonsterCard({ numero: "700", tipo: "armadilha" });
    const table: CardEnrichmentTable = {
      "700": { atributo: null, nivel: 4, descricao: null },
    };

    const result = applyEnrichment(card, table);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_enrichment_entry");
  });
});
