import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Card } from "@yugioh/shared";
import { generateCardPricesSeed } from "./generate-card-prices-seed.ts";

describe("committed card price seed", () => {
  it("matches the sealed catalog card for card", async () => {
    const cards = JSON.parse(await readFile(resolve("generated/cards.json"), "utf8")) as Card[];
    const seal = JSON.parse(await readFile(resolve("generated/dataset-seal.json"), "utf8")) as { generatedAt: string };
    const committed = await readFile(resolve("../../supabase/migrations/0011_seed_card_prices.sql"), "utf8");
    expect(committed).toBe(generateCardPricesSeed(cards, seal.generatedAt));
    expect(cards.filter((entry) => entry.password !== null)).toHaveLength(698);
  });
});
