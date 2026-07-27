import type { Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { sourceCard } from "../../tests/fixtures/source-records.ts";
import { buildArtManifest } from "./art-manifest.ts";
import { normalizeCard } from "./normalize-card.ts";

function card(numero: string): Card {
  const result = normalizeCard(sourceCard({ id: Number(numero), numero }), `${numero}.json`);
  if (!result.ok) {
    throw new Error(`fixture ${numero} is not a valid card: ${result.error.message}`);
  }
  return result.value;
}

describe("buildArtManifest", () => {
  it("maps a numero to the path of its art file", () => {
    const { manifest } = buildArtManifest(
      [card("001"), card("002")],
      ["cards-data/001.jpg", "cards-data/002.jpg"],
    );
    expect(manifest).toEqual({
      "001": "cards-data/001.jpg",
      "002": "cards-data/002.jpg",
    });
  });

  it("omits a card without art from the manifest and lists it in missingArts", () => {
    const result = buildArtManifest([card("001"), card("002")], ["cards-data/001.jpg"]);
    expect(result.manifest).toEqual({ "001": "cards-data/001.jpg" });
    expect(result.missingArts).toEqual(["002"]);
  });

  it("lists art without a matching card in orphanArts", () => {
    const result = buildArtManifest([card("001")], ["cards-data/001.jpg", "cards-data/999.jpg"]);
    expect(result.orphanArts).toEqual(["cards-data/999.jpg"]);
    expect(result.missingArts).toEqual([]);
  });

  it("treats a file that is not a card number as an orphan", () => {
    const result = buildArtManifest([card("001")], ["cards-data/001.jpg", "cards-data/back.jpg"]);
    expect(result.manifest).toEqual({ "001": "cards-data/001.jpg" });
    expect(result.orphanArts).toEqual(["cards-data/back.jpg"]);
  });

  it("does not depend on the order the art files were listed in", () => {
    const forward = buildArtManifest(
      [card("001"), card("002")],
      ["cards-data/001.jpg", "cards-data/002.jpg"],
    );
    const reversed = buildArtManifest(
      [card("002"), card("001")],
      ["cards-data/002.jpg", "cards-data/001.jpg"],
    );
    expect(reversed).toEqual(forward);
  });
});
