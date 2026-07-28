import { DEFAULT_ART_PLACEHOLDER_PATH, type CardNumber } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { ArtManifest } from "../ingestion/art-manifest.ts";
import { monsterCard } from "../../tests/fixtures/validation-datasets.ts";
import { resolveArt } from "./resolve-art.ts";

const MANIFEST: ArtManifest = Object.freeze({
  "001": "cards-data/001.jpg",
  "003": "cards-data/003.jpg",
});

describe("resolveArt", () => {
  it("resolves tipo arte for a numero present in the manifest", () => {
    const result = resolveArt("001", MANIFEST);

    expect(result).toEqual({ numero: "001", tipo: "arte", caminho: "cards-data/001.jpg" });
  });

  it("resolves tipo placeholder for a numero absent from the manifest", () => {
    const result = resolveArt("999" as CardNumber, MANIFEST);

    expect(result).toEqual({
      numero: "999",
      tipo: "placeholder",
      caminho: DEFAULT_ART_PLACEHOLDER_PATH,
    });
  });

  it("accepts a Card as input and uses the card's own numero", () => {
    const card = monsterCard({ numero: "001" });

    expect(resolveArt(card, MANIFEST)).toEqual({
      numero: "001",
      tipo: "arte",
      caminho: "cards-data/001.jpg",
    });
  });

  it("accepts a bare numero as input", () => {
    expect(resolveArt("003", MANIFEST)).toEqual({
      numero: "003",
      tipo: "arte",
      caminho: "cards-data/003.jpg",
    });
  });

  it("returns the default placeholder path from the shared constant", () => {
    const result = resolveArt("999" as CardNumber, MANIFEST);

    expect(result.caminho).toBe(DEFAULT_ART_PLACEHOLDER_PATH);
  });

  it("never throws even with an empty manifest", () => {
    expect(() => resolveArt("001", Object.freeze({}))).not.toThrow();
    expect(resolveArt("001", Object.freeze({}))).toEqual({
      numero: "001",
      tipo: "placeholder",
      caminho: DEFAULT_ART_PLACEHOLDER_PATH,
    });
  });

  it("includes the input numero in the result's numero field", () => {
    expect(resolveArt("777" as CardNumber, MANIFEST).numero).toBe("777");
  });

  it("treats an unknown numero the same as art genuinely missing", () => {
    const knownButMissing = resolveArt("002" as CardNumber, MANIFEST);
    const unknownAltogether = resolveArt("unknown" as CardNumber, MANIFEST);

    expect(knownButMissing.tipo).toBe("placeholder");
    expect(unknownAltogether.tipo).toBe("placeholder");
    expect(knownButMissing.caminho).toBe(unknownAltogether.caminho);
  });
});

describe("resolveArt (property-based)", () => {
  it("is total: always returns a non-empty caminho, never throws", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.dictionary(fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
        (numero, manifestRecord) => {
          const manifest = Object.freeze(manifestRecord) as ArtManifest;
          const result = resolveArt(numero as CardNumber, manifest);

          expect(result.caminho.length).toBeGreaterThan(0);
        },
      ),
    );
  });

  it("covers every manifest key exhaustively", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
        fc.string(),
        (manifestRecord, extraNumero) => {
          const manifest = Object.freeze(manifestRecord) as ArtManifest;

          for (const numero of Object.keys(manifest)) {
            const result = resolveArt(numero as CardNumber, manifest);
            expect(result.tipo).toBe("arte");
            expect(result.caminho).toBe(manifest[numero]);
          }

          if (!(extraNumero in manifest)) {
            const result = resolveArt(extraNumero as CardNumber, manifest);
            expect(result.tipo).toBe("placeholder");
            expect(result.caminho).toBe(DEFAULT_ART_PLACEHOLDER_PATH);
          }
        },
      ),
    );
  });

  it("is idempotent: the same input always produces the same output", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.dictionary(fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
        (numero, manifestRecord) => {
          const manifest = Object.freeze(manifestRecord) as ArtManifest;

          expect(resolveArt(numero as CardNumber, manifest)).toEqual(
            resolveArt(numero as CardNumber, manifest),
          );
        },
      ),
    );
  });
});
