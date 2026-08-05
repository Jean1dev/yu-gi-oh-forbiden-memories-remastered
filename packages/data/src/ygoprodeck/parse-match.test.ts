import { describe, expect, it } from "vitest";

import { parseYgoprodeckMatch } from "./parse-match.ts";
import type { YgoprodeckCardResponse } from "./types.ts";

function response(overrides: Partial<YgoprodeckCardResponse> = {}): YgoprodeckCardResponse {
  return {
    id: 89_631_139,
    name: "Blue-Eyes White Dragon",
    attribute: "LIGHT",
    level: 8,
    desc: "This legendary dragon is a powerful engine of destruction.",
    card_images: [{ image_url_cropped: "https://images.ygoprodeck.com/images/cards_cropped/89631139.jpg" }],
    ...overrides,
  };
}

describe("parseYgoprodeckMatch", () => {
  it("maps attribute and level when tipo is monstro", () => {
    const result = parseYgoprodeckMatch("001", "monstro", response());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.atributo).toBe("LIGHT");
    expect(result.value.nivel).toBe(8);
  });

  it("zeroes out nivel when tipo is not monstro, even with level present in the response", () => {
    const result = parseYgoprodeckMatch("320", "magica", response({ attribute: undefined, level: 4 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nivel).toBeNull();
  });

  it("uses null for atributo when the response does not report attribute", () => {
    const result = parseYgoprodeckMatch("320", "magica", response({ attribute: undefined }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.atributo).toBeNull();
  });

  it("uses null for atributo when the value does not match the standard 7-value enum", () => {
    const result = parseYgoprodeckMatch("001", "monstro", response({ attribute: "SPELL" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.atributo).toBeNull();
  });

  it("extracts artCropUrl from the first card_images entry", () => {
    const result = parseYgoprodeckMatch(
      "001",
      "monstro",
      response({
        card_images: [
          { image_url_cropped: "https://images.ygoprodeck.com/images/cards_cropped/first.jpg" },
          { image_url_cropped: "https://images.ygoprodeck.com/images/cards_cropped/second.jpg" },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.artCropUrl).toBe(
      "https://images.ygoprodeck.com/images/cards_cropped/first.jpg",
    );
  });

  it("returns an error when the response has no card_images", () => {
    const result = parseYgoprodeckMatch("001", "monstro", response({ card_images: [] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_response");
  });
});
