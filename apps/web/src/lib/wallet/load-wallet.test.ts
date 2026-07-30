import { DomainError, err, ok } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { loadWalletBalance } from "./load-wallet.ts";

const clock = { now: () => new Date("2026-07-30T00:00:00.000Z") };

describe("loadWalletBalance", () => {
  it("returns and caches the server balance", async () => {
    const saved: unknown[] = [];
    const result = await loadWalletBalance({
      playerId: "player",
      repository: { load: async () => ok({ playerId: "player", stars: 12 }) },
      cache: { loadSnapshot: async () => undefined, saveSnapshot: async (value) => void saved.push(value) },
      clock,
    });
    expect(result).toEqual({
      ok: true,
      value: { origin: "server", stars: 12, syncedAt: "2026-07-30T00:00:00.000Z" },
    });
    expect(saved).toHaveLength(1);
  });

  it("falls back to cache and errors when both sources fail", async () => {
    const repository = {
      load: async () => err(new DomainError("offline", "wallet_unavailable")),
    };
    const cached = await loadWalletBalance({
      playerId: "player",
      repository,
      cache: {
        loadSnapshot: async () => ({ playerId: "player", stars: 7, syncedAt: "earlier" }),
        saveSnapshot: async () => undefined,
      },
      clock,
    });
    expect(cached).toEqual({ ok: true, value: { origin: "cache", stars: 7, syncedAt: "earlier" } });

    const unavailable = await loadWalletBalance({
      playerId: "player",
      repository,
      cache: { loadSnapshot: async () => undefined, saveSnapshot: async () => undefined },
      clock,
    });
    expect(unavailable.ok).toBe(false);
  });
});
