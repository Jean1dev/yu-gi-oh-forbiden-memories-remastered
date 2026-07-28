import type { Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createCatalog } from "../catalog/create-catalog.ts";
import type { CardCatalog } from "../catalog/types.ts";
import {
  VALID_SEAL,
  catalogManifest,
  rawCatalogCards,
} from "../../tests/fixtures/catalog-datasets.ts";
import { manifestFor, monsterCard, nonMonsterCard, rawDataset } from "../../tests/fixtures/validation-datasets.ts";
import { deriveKnownMonsterClasses } from "./derive-known-monster-classes.ts";

function buildOrFail(rawCards: unknown, manifest: ReturnType<typeof catalogManifest>): CardCatalog {
  const result = createCatalog({ rawCards, manifest, seal: VALID_SEAL });
  if (!result.ok) {
    throw new Error(`catalog was expected to build: ${result.error.message}`);
  }
  return result.value;
}

describe("deriveKnownMonsterClasses", () => {
  it("ignora classes de cartas nao monstro", () => {
    const catalog = buildOrFail(rawCatalogCards(), catalogManifest());

    // catalogCards() carrega Trap (armadilha), Magic (magica) e Ritual (ritual)
    // além das classes de monstro Dragon/Warrior/Beast-Warrior (spec F07 fixture).
    const classes = deriveKnownMonsterClasses(catalog);

    expect(classes).not.toContain("Trap");
    expect(classes).not.toContain("Magic");
    expect(classes).not.toContain("Ritual");
  });

  it("remove duplicatas e ordena alfabeticamente", () => {
    const cards: readonly Card[] = [
      monsterCard({ numero: "001", classe: "Warrior" }),
      monsterCard({ numero: "002", classe: "Dragon" }),
      monsterCard({ numero: "003", classe: "Warrior" }),
    ];
    const catalog = buildOrFail(rawDataset(cards), manifestFor(cards));

    expect(deriveKnownMonsterClasses(catalog)).toEqual(["Dragon", "Warrior"]);
  });

  it("retorna lista vazia quando o catalogo nao possui monstros", () => {
    const cards: readonly Card[] = [nonMonsterCard({ numero: "700" })];
    const catalog = buildOrFail(rawDataset(cards), manifestFor(cards));

    expect(deriveKnownMonsterClasses(catalog)).toEqual([]);
  });
});
