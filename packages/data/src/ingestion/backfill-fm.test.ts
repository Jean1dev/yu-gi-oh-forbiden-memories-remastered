import { describe, expect, it } from "vitest";

import { backfillEnrichment, normalizeFmDescription, type FmCardInfo } from "./backfill-fm.ts";
import type { CardEnrichmentEntry, CardEnrichmentTable } from "./enrichment.ts";

function entry(overrides: Partial<CardEnrichmentEntry> = {}): CardEnrichmentEntry {
  return { atributo: null, nivel: null, descricao: null, ...overrides };
}

function row(overrides: Partial<FmCardInfo> = {}): FmCardInfo {
  return { Type: null, Attribute: null, Level: null, Description: null, ...overrides };
}

function source(entries: Record<string, FmCardInfo>): ReadonlyMap<string, FmCardInfo> {
  return new Map(Object.entries(entries));
}

describe("normalizeFmDescription", () => {
  it("colapsa as quebras de linha do PS1 numa linha so", () => {
    expect(
      normalizeFmDescription("A delicious\n\nbeef curry increases\n\nLife Points by 200!"),
    ).toBe("A delicious beef curry increases Life Points by 200!");
  });
});

describe("backfillEnrichment", () => {
  it("cria entrada para o monstro ausente, com atributo e nivel", () => {
    const { table, report } = backfillEnrichment(
      {},
      source({ "380": row({ Type: "Dragon", Attribute: "Light", Level: 12 }) }),
    );

    expect(table["380"]).toEqual({ atributo: "LIGHT", nivel: 12, descricao: null });
    expect(report.entriesCreated).toEqual(["380"]);
  });

  it("nao cria entrada para carta ausente sem atributo a contribuir", () => {
    // Rituais, armadilhas e as duas magicas que o YGOPRODeck nunca casou. Dar
    // `descricao` a elas as tiraria da arte legada sem ter arte de recorte.
    const { table, report } = backfillEnrichment(
      {},
      source({ "665": row({ Type: "Ritual", Description: "Sacrifices the monster." }) }),
    );

    expect(table["665"]).toBeUndefined();
    expect(report.entriesCreated).toEqual([]);
  });

  it("troca a descricao TCG pela do jogo original numa magica", () => {
    const table: CardEnrichmentTable = {
      "343": entry({ descricao: "Inflict 200 points of damage to your opponent's Life Points." }),
    };
    const result = backfillEnrichment(
      table,
      source({
        "343": row({
          Type: "Magic",
          Description: "A shower of sparks\n\ninflicts 50 points of\n\ndamage!!",
        }),
      }),
    );

    expect(result.table["343"]?.descricao).toBe("A shower of sparks inflicts 50 points of damage!!");
    expect(result.report.descriptionsReplaced).toEqual(["343"]);
  });

  it("nunca introduz uma descricao onde nao havia", () => {
    // `checkCardFrameCoverage` pareia `descricao !== null` com a arte de
    // recorte; introduzir texto aqui quebraria a ingestao.
    const result = backfillEnrichment(
      { "655": entry() },
      source({ "655": row({ Type: "Magic", Description: "Cancels the magic." }) }),
    );

    expect(result.table["655"]?.descricao).toBeNull();
    expect(result.report.descriptionsReplaced).toEqual([]);
  });

  it("preserva o texto de sabor de um monstro que ja tem", () => {
    const original = "A warrior that fights with his bare hands!!!";
    const result = backfillEnrichment(
      { "100": entry({ atributo: "EARTH", nivel: 3, descricao: original }) },
      source({ "100": row({ Type: "Warrior", Attribute: "Earth", Level: 3, Description: "Outro." }) }),
    );

    expect(result.table["100"]?.descricao).toBe(original);
    expect(result.report.descriptionsReplaced).toEqual([]);
  });

  it("preenche so o atributo faltante, sem tocar no resto da entrada", () => {
    const result = backfillEnrichment(
      { "100": entry({ nivel: 3, descricao: "Flavour." }) },
      source({ "100": row({ Type: "Warrior", Attribute: "Earth", Level: 7 }) }),
    );

    expect(result.table["100"]).toEqual({ atributo: "EARTH", nivel: 3, descricao: "Flavour." });
    expect(result.report.attributesFilled).toEqual(["100"]);
  });

  it("nao reescreve uma descricao que ja e a do jogo original", () => {
    const fm = "A shower of sparks inflicts 50 points of damage!!";
    const result = backfillEnrichment(
      { "343": entry({ descricao: fm }) },
      source({ "343": row({ Type: "Magic", Description: fm }) }),
    );

    expect(result.report.descriptionsReplaced).toEqual([]);
  });
});
