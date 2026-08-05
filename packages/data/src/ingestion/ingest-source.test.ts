import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  MALFORMED_JSON,
  errorEnvelope,
  missingCardEnvelope,
  sourceFile,
  successEnvelope,
} from "../../tests/fixtures/source-records.ts";
import { ingestSource, type SourceFile } from "./ingest-source.ts";
import { serializeArtifacts } from "./serialize.ts";

const GENERATED_AT = "2026-07-27T12:00:00.000Z";

type EnrichmentTable = NonNullable<Parameters<typeof ingestSource>[0]["enrichment"]>;

function ingest(
  files: readonly SourceFile[],
  availableArts: readonly string[] = [],
  enrichment: EnrichmentTable = {},
) {
  return ingestSource({ files, availableArts, enrichment, generatedAt: GENERATED_AT });
}

function ingestOrThrow(
  files: readonly SourceFile[],
  availableArts: readonly string[] = [],
  enrichment: EnrichmentTable = {},
) {
  const result = ingest(files, availableArts, enrichment);
  if (!result.ok) {
    throw new Error(`expected ingestion to succeed, got ${result.error.code}`);
  }
  return result.value;
}

describe("ingestSource discards", () => {
  it("discards a success:false envelope without counting it as a card", () => {
    const { cards, report } = ingestOrThrow([
      sourceFile("001"),
      { name: "01.json", content: errorEnvelope() },
    ]);
    expect(cards).toHaveLength(1);
    expect(report.discardedByError).toBe(1);
    expect(report.discardedAsInvalid).toEqual([]);
  });

  it("discards malformed JSON and carries on with the batch", () => {
    const { cards, report } = ingestOrThrow([
      sourceFile("001"),
      { name: "002.json", content: MALFORMED_JSON },
      sourceFile("003"),
    ]);
    expect(cards.map((card) => card.numero)).toEqual(["001", "003"]);
    expect(report.discardedAsInvalid).toEqual([
      { file: "002.json", reason: "file is not valid JSON", code: "invalid_envelope" },
    ]);
  });

  it("discards an envelope with no card object and names the file", () => {
    const { report } = ingestOrThrow([
      sourceFile("001"),
      { name: "002.json", content: missingCardEnvelope() },
    ]);
    expect(report.discardedAsInvalid).toEqual([
      {
        file: "002.json",
        reason: "envelope reports success but carries no card",
        code: "missing_card",
      },
    ]);
  });

  it("discards a record that fails the canonical schema and carries on", () => {
    const { cards, report } = ingestOrThrow([
      sourceFile("001"),
      { name: "002.json", content: successEnvelope({ id: 2, numero: "002", atk: "N/A" }) },
    ]);
    expect(cards).toHaveLength(1);
    expect(report.discardedAsInvalid[0]?.code).toBe("invalid_numeric_field");
  });
});

describe("ingestSource aborts", () => {
  it("fails when the file list is empty", () => {
    const result = ingest([]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("source_missing");
  });

  it("fails when two valid records claim the same numero", () => {
    const result = ingest([
      sourceFile("001"),
      { name: "01.json", content: successEnvelope({ id: 1, numero: "001" }) },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("card_number_collision");
  });
});

describe("ingestSource report", () => {
  it("marks complete false when a record was discarded as invalid", () => {
    const { report } = ingestOrThrow([
      { name: "002.json", content: MALFORMED_JSON },
      ...Array.from({ length: 722 }, (_unused, index) =>
        sourceFile(String(index + 1).padStart(3, "0")),
      ),
    ]);
    expect(report.complete).toBe(false);
  });

  it("marks complete false when a numero is missing", () => {
    const { report } = ingestOrThrow([sourceFile("001")]);
    expect(report.complete).toBe(false);
    expect(report.missingNumbers).toContain("002");
  });

  it("marks complete true for a full contiguous dataset with no discards", () => {
    const { report } = ingestOrThrow(
      Array.from({ length: 722 }, (_unused, index) =>
        sourceFile(String(index + 1).padStart(3, "0")),
      ),
    );
    expect(report.complete).toBe(true);
    expect(report.cardsEmitted).toBe(722);
  });

  it("derives observedClasses from the emitted dataset", () => {
    const { report } = ingestOrThrow([
      sourceFile("001", { classe: "Dragon" }),
      sourceFile("002", { classe: "Sea Serpent" }),
      sourceFile("003", { classe: "Dragon" }),
    ]);
    expect(report.observedClasses).toEqual(["Dragon", "Sea Serpent"]);
  });

  it("counts every known type, including the ones absent from the dataset", () => {
    const { report } = ingestOrThrow([
      sourceFile("001", { tipo: "monstro" }),
      sourceFile("002", { tipo: "ritual", atk: "", def: "", guardiao1: "", guardiao2: "" }),
    ]);
    expect(report.observedTypes).toEqual({
      monstro: 1,
      armadilha: 0,
      equipamento: 0,
      magica: 0,
      ritual: 1,
    });
  });

  it("counts every scanned file in filesRead, discarded ones included", () => {
    const { report } = ingestOrThrow([
      sourceFile("001"),
      { name: "01.json", content: errorEnvelope() },
      { name: "002.json", content: MALFORMED_JSON },
    ]);
    expect(report.filesRead).toBe(3);
  });
});

describe("ingestSource enrichment", () => {
  it("fills atributo/nivel/descricao for a card present in the enrichment table", () => {
    const { cards } = ingestOrThrow([sourceFile("001", { tipo: "monstro" })], [], {
      "001": { atributo: "LIGHT", nivel: 8, descricao: "A powerful dragon." },
    });
    expect(cards[0]).toMatchObject({ atributo: "LIGHT", nivel: 8, descricao: "A powerful dragon." });
  });

  it("keeps atributo/nivel/descricao null for a card absent from the enrichment table", () => {
    const { cards } = ingestOrThrow([sourceFile("001")], [], {
      "002": { atributo: "LIGHT", nivel: 8, descricao: "A powerful dragon." },
    });
    expect(cards[0]).toMatchObject({ atributo: null, nivel: null, descricao: null });
  });

  it("produces the same result with an empty or absent enrichment table", () => {
    const withoutTable = ingestOrThrow([sourceFile("001")]);
    const withEmptyTable = ingestOrThrow([sourceFile("001")], [], {});
    expect(withEmptyTable.cards).toEqual(withoutTable.cards);
  });

  it("discards an enrichment entry that violates the schema and reports it, keeping the card", () => {
    const { cards, report } = ingestOrThrow([sourceFile("001", { tipo: "armadilha" })], [], {
      "001": { atributo: null, nivel: 4, descricao: null },
    });
    expect(cards[0]?.nivel).toBeNull();
    expect(report.discardedEnrichment).toEqual([
      {
        numero: "001",
        reason: expect.stringContaining("001") as unknown as string,
        code: "invalid_enrichment_entry",
      },
    ]);
  });
});

describe("ingestSource determinism", () => {
  const files = [
    sourceFile("001"),
    sourceFile("002"),
    sourceFile("003"),
    { name: "01.json", content: errorEnvelope() },
    { name: "02.json", content: errorEnvelope() },
  ];
  const arts = ["cards-data/001.jpg", "cards-data/002.jpg", "cards-data/003.jpg"];

  it("produces identical bytes for any permutation of the input files", () => {
    const reference = serializeArtifacts(ingestOrThrow(files, arts));

    fc.assert(
      fc.property(fc.shuffledSubarray(files, { minLength: files.length }), (shuffled) => {
        const artifacts = serializeArtifacts(ingestOrThrow(shuffled, arts));
        return (
          artifacts.cardsJson === reference.cardsJson &&
          artifacts.artManifestJson === reference.artManifestJson
        );
      }),
      { numRuns: 1000 },
    );
  });

  it("keeps the surviving cards unchanged when discarded files are injected", () => {
    const reference = serializeArtifacts(ingestOrThrow(files, arts)).cardsJson;

    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(errorEnvelope(), MALFORMED_JSON), { maxLength: 20 }),
        fc.integer({ min: 0, max: files.length }),
        (noise, position) => {
          const noiseFiles = noise.map((content, index) => ({
            name: `9${String(index).padStart(2, "0")}.json`,
            content,
          }));
          const polluted = [...files.slice(0, position), ...noiseFiles, ...files.slice(position)];
          return serializeArtifacts(ingestOrThrow(polluted, arts)).cardsJson === reference;
        },
      ),
      { numRuns: 200 },
    );
  });
});
