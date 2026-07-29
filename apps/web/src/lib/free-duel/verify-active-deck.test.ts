import { describe, expect, it, vi } from "vitest";
import { DomainError, err, ok, type Card } from "@yugioh/shared";
import { verifyActiveDeck } from "./verify-active-deck.ts";

const composition = Object.fromEntries(
  Array.from({ length: 20 }, (_, index) => [String(index + 1).padStart(3, "0"), 2]),
);
const catalog = () => ({}) as Card;
const cache = { read: vi.fn(async () => undefined) };

describe("verifyActiveDeck", () => {
  it("releases a valid server deck", async () => {
    const repository = {
      read: vi.fn(async () => ok({ composition, updatedAt: "2026-07-29T00:00:00.000Z" })),
    };
    await expect(
      verifyActiveDeck({ playerId: "p1", repository, cache, catalog }),
    ).resolves.toMatchObject({
      status: "ready",
      hasValidDeck: true,
      origin: "server",
      readyDeck: { total: 40 },
    });
  });

  it("blocks missing and invalid decks", async () => {
    const missing = { read: vi.fn(async () => ok(undefined)) };
    await expect(
      verifyActiveDeck({ playerId: "p1", repository: missing, cache, catalog }),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "missing_deck",
    });
    const invalid = {
      read: vi.fn(async () => ok({ composition: { "001": 4 }, updatedAt: "now" })),
    };
    await expect(
      verifyActiveDeck({ playerId: "p1", repository: invalid, cache, catalog }),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "invalid_deck",
    });
  });

  it("falls back to a valid cache snapshot", async () => {
    const repository = {
      read: vi.fn(async () => err(new DomainError("offline", "active_deck_unavailable"))),
    };
    const cached = { read: vi.fn(async () => ({ composition, updatedAt: "cached" })) };
    await expect(
      verifyActiveDeck({ playerId: "p1", repository, cache: cached, catalog }),
    ).resolves.toMatchObject({
      status: "ready",
      origin: "cache",
    });
  });

  it("returns unavailable without a session", async () => {
    const repository = { read: vi.fn(async () => err(new DomainError("offline", "x"))) };
    await expect(verifyActiveDeck({ repository, cache, catalog })).resolves.toMatchObject({
      status: "unavailable",
      reason: "missing_session",
    });
  });

  it("returns unavailable without a catalog", async () => {
    const repository = { read: vi.fn(async () => err(new DomainError("offline", "x"))) };
    await expect(verifyActiveDeck({ playerId: "p1", repository, cache })).resolves.toMatchObject({
      status: "unavailable",
      reason: "catalog_unavailable",
    });
  });
});
