import { DEFAULT_ART_PLACEHOLDER_PATH, type CardNumber, type CardType } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { PASSWORD_NOT_FOUND, type CardCatalog } from "../catalog/types.ts";
import type { ArtManifest } from "../ingestion/art-manifest.ts";
import { createArtResolver, createArtResolverFromCatalog } from "./create-art-resolver.ts";

const MANIFEST: ArtManifest = Object.freeze({ "001": "cards-data/001.jpg" });

/** Minimal stand-in for a real F03 catalog: only getArtManifest matters here. */
function fakeCatalog(manifest: ArtManifest): CardCatalog {
  const zeroCounts = Object.freeze({
    monstro: 0,
    armadilha: 0,
    equipamento: 0,
    magica: 0,
    ritual: 0,
  }) as Readonly<Record<CardType, number>>;

  return Object.freeze({
    getByNumero: () => undefined,
    listByTipo: () => [],
    listByClasse: () => [],
    listByGuardiao: () => [],
    findByPassword: () => PASSWORD_NOT_FOUND,
    totalCount: () => 0,
    countByTipo: () => zeroCounts,
    countByClasse: () => Object.freeze({}),
    getArtManifest: () => manifest,
  });
}

describe("createArtResolver", () => {
  it("closes over the manifest received and resolves subsequent queries", () => {
    const resolver = createArtResolver(MANIFEST);

    expect(resolver.resolve("001")).toEqual({
      numero: "001",
      tipo: "arte",
      caminho: "cards-data/001.jpg",
    });
    expect(resolver.resolve("999" as CardNumber)).toEqual({
      numero: "999",
      tipo: "placeholder",
      caminho: DEFAULT_ART_PLACEHOLDER_PATH,
    });
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(createArtResolver(MANIFEST))).toBe(true);
  });
});

describe("createArtResolverFromCatalog", () => {
  it("uses the manifest exposed by getArtManifest of the catalog", () => {
    const catalog = fakeCatalog(MANIFEST);
    const resolver = createArtResolverFromCatalog(catalog);

    expect(resolver.resolve("001")).toEqual({
      numero: "001",
      tipo: "arte",
      caminho: "cards-data/001.jpg",
    });
  });
});
