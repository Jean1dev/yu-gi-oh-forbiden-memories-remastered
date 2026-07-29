import { describe, expect, it, vi } from "vitest";
import { loadCatalogFromDisk } from "@yugioh/data/catalog/disk";
import { ok } from "@yugioh/shared";
import { verifyActiveDeck } from "../src/lib/free-duel/verify-active-deck.ts";
import { generatedDataDir } from "../src/lib/server/repo-root.ts";

describe("active deck verification integration", () => {
  it("releases forty real catalog cards and rejects an unknown number", async () => {
    const catalog = await loadCatalogFromDisk({ generatedDir: generatedDataDir() });
    if (!catalog.ok) throw catalog.error;
    const composition = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [String(index + 1).padStart(3, "0"), 2]),
    );
    const repository = {
      read: vi.fn(async () => ok({ composition, updatedAt: "2026-07-29T00:00:00.000Z" })),
    };
    const cache = { read: vi.fn(async () => undefined) };
    await expect(
      verifyActiveDeck({
        playerId: "player",
        repository,
        cache,
        catalog: (number) => catalog.value.getByNumero(number),
      }),
    ).resolves.toMatchObject({ status: "ready", hasValidDeck: true });

    repository.read.mockResolvedValueOnce(
      ok({ composition: { ...composition, "999": 1 }, updatedAt: "now" }),
    );
    await expect(
      verifyActiveDeck({
        playerId: "player",
        repository,
        cache,
        catalog: (number) => catalog.value.getByNumero(number),
      }),
    ).resolves.toMatchObject({ status: "blocked", reason: "invalid_deck" });
  });
});
