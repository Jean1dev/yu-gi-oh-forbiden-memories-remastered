import { GUARDIAN_STARS, type Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createCatalog } from "../catalog/create-catalog.ts";
import type { CardCatalog } from "../catalog/types.ts";
import {
  VALID_SEAL,
  catalogManifest,
  rawCatalogCards,
} from "../../tests/fixtures/catalog-datasets.ts";
import {
  nonMonsterCard,
  manifestFor,
  rawDataset,
} from "../../tests/fixtures/validation-datasets.ts";
import { getUsedGuardianStars } from "./guardian-stars-used.ts";

function buildOrFail(rawCards: unknown, manifest: ReturnType<typeof catalogManifest>): CardCatalog {
  const result = createCatalog({ rawCards, manifest, seal: VALID_SEAL });
  if (!result.ok) {
    throw new Error(`catalog was expected to build: ${result.error.message}`);
  }
  return result.value;
}

describe("getUsedGuardianStars", () => {
  it("retorna apenas os guardioes com pelo menos uma carta no catalogo", () => {
    const catalog = buildOrFail(rawCatalogCards(), catalogManifest());

    // catalogCards() só usa Sun, Mars, Moon e Jupiter (spec F06 fixture).
    expect(getUsedGuardianStars(catalog)).toEqual(["Sun", "Moon", "Mars", "Jupiter"]);
  });

  it("retorna lista vazia quando o catalogo nao usa nenhum guardiao", () => {
    const cards: readonly Card[] = [
      nonMonsterCard({ numero: "700" }),
      nonMonsterCard({ numero: "701" }),
    ];
    const catalog = buildOrFail(rawDataset(cards), manifestFor(cards));

    expect(getUsedGuardianStars(catalog)).toEqual([]);
  });

  it("preserva a ordem de GUARDIOES_ESTELARES", () => {
    const catalog = buildOrFail(rawCatalogCards(), catalogManifest());
    const used = getUsedGuardianStars(catalog);

    const expectedOrder = GUARDIAN_STARS.filter((guardiao) => used.includes(guardiao));
    expect(used).toEqual(expectedOrder);
  });
});
