import { describe, expect, it, vi } from "vitest";

import type { LoadedRoster } from "@yugioh/data/roster";

import { loadClientRoster, type ClientRosterDependencies } from "./load-client-roster.ts";
import type { RosterCache } from "./roster-cache.ts";

const emptyRoster: LoadedRoster = {
  rosterVersion: "0.0.0",
  duelists: [],
  report: {
    declaredDuelists: 0,
    availableDuelists: 0,
    hidden: [],
    observedDropTiers: [],
    missingPortraits: [],
    valid: true,
  },
};

function dependencies(overrides: Partial<ClientRosterDependencies> = {}) {
  const cache: RosterCache = {
    read: vi.fn(async () => null),
    write: vi.fn(async () => undefined),
  };
  return {
    value: {
      readSource: vi.fn(async () => ({
        rawRoster: { rosterVersion: "0.0.0", duelists: [] },
        cardNumbers: ["001"],
        hash: null,
      })),
      cache,
      now: () => "2026-07-29T00:00:00.000Z",
      ...overrides,
    } satisfies ClientRosterDependencies,
    cache,
  };
}

describe("loadClientRoster", () => {
  it("validates the bundle and writes the snapshot", async () => {
    const setup = dependencies();
    await expect(loadClientRoster(setup.value)).resolves.toMatchObject({
      source: "bundle",
      roster: { rosterVersion: "0.0.0" },
    });
    expect(setup.cache.write).toHaveBeenCalledOnce();
  });

  it("falls back to cache when reading the source fails", async () => {
    const setup = dependencies({
      readSource: vi.fn(async () => {
        throw new Error("offline");
      }),
      cache: {
        read: vi.fn(async () => emptyRoster),
        write: vi.fn(async () => undefined),
      },
    });
    await expect(loadClientRoster(setup.value)).resolves.toEqual({
      roster: emptyRoster,
      source: "cache",
      notice: "cache",
    });
  });

  it("falls back to cache when the roster envelope is corrupt", async () => {
    const setup = dependencies({
      readSource: vi.fn(async () => ({
        rawRoster: null,
        cardNumbers: ["001"],
        hash: null,
      })),
      cache: {
        read: vi.fn(async () => emptyRoster),
        write: vi.fn(async () => undefined),
      },
    });
    await expect(loadClientRoster(setup.value)).resolves.toMatchObject({
      source: "cache",
      notice: "cache",
    });
  });

  it("returns an empty state when source and cache fail", async () => {
    const setup = dependencies({
      readSource: vi.fn(async () => {
        throw new Error("offline");
      }),
    });
    await expect(loadClientRoster(setup.value)).resolves.toEqual({
      roster: null,
      source: "empty",
    });
  });

  it("blocks when the catalog payload is unavailable", async () => {
    const setup = dependencies({
      readSource: vi.fn(async () => ({
        rawRoster: { rosterVersion: "0.0.0", duelists: [] },
        cardNumbers: null as never,
        hash: null,
      })),
    });
    await expect(loadClientRoster(setup.value)).resolves.toEqual({
      roster: null,
      source: "empty",
      notice: "catalog_unavailable",
    });
  });

  it("continues when cache writing is unavailable", async () => {
    const setup = dependencies({
      cache: {
        read: vi.fn(async () => null),
        write: vi.fn(async () => {
          throw new Error("IndexedDB unavailable");
        }),
      },
    });
    await expect(loadClientRoster(setup.value)).resolves.toMatchObject({ source: "bundle" });
  });
});
