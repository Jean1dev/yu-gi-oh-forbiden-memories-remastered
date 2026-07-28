import { CARD_FIELD_ORDER } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { sourceFile } from "../../tests/fixtures/source-records.ts";
import { ingestSource, type SourceFile } from "./ingest-source.ts";
import { serializeArtifacts } from "./serialize.ts";

function serialize(files: readonly SourceFile[], availableArts: readonly string[] = []) {
  const result = ingestSource({
    files,
    availableArts,
    generatedAt: "2026-07-27T12:00:00.000Z",
  });
  if (!result.ok) {
    throw new Error(`expected ingestion to succeed, got ${result.error.code}`);
  }
  return serializeArtifacts(result.value);
}

describe("serializeArtifacts", () => {
  it("emits the card keys in canonical order", () => {
    const { cardsJson } = serialize([sourceFile("001")]);
    const firstCard = (JSON.parse(cardsJson) as Record<string, unknown>[])[0];
    expect(Object.keys(firstCard ?? {})).toEqual([...CARD_FIELD_ORDER]);
  });

  it("sorts the manifest keys", () => {
    const { artManifestJson } = serialize(
      [sourceFile("003"), sourceFile("001"), sourceFile("002")],
      ["cards-data/002.jpg", "cards-data/003.jpg", "cards-data/001.jpg"],
    );
    expect(Object.keys(JSON.parse(artManifestJson) as Record<string, string>)).toEqual([
      "001",
      "002",
      "003",
    ]);
  });

  it("ends every artifact with a newline", () => {
    const artifacts = serialize([sourceFile("001")], ["cards-data/001.jpg"]);
    expect(artifacts.cardsJson.endsWith("\n")).toBe(true);
    expect(artifacts.artManifestJson.endsWith("\n")).toBe(true);
    expect(artifacts.ingestionReportJson.endsWith("\n")).toBe(true);
  });

  it("indents with two spaces", () => {
    const { cardsJson } = serialize([sourceFile("001")]);
    expect(cardsJson.split("\n")[1]).toBe("  {");
  });

  it("keeps generatedAt out of cards.json and the art manifest", () => {
    const artifacts = serialize([sourceFile("001")], ["cards-data/001.jpg"]);
    expect(artifacts.cardsJson).not.toContain("2026-07-27");
    expect(artifacts.artManifestJson).not.toContain("2026-07-27");
    expect(artifacts.ingestionReportJson).toContain("2026-07-27T12:00:00.000Z");
  });
});
