import { loadRoster, type LoadedRoster } from "@yugioh/data/roster";
import type { CardCatalogLookup, CardNumber } from "@yugioh/shared";

import { log } from "../logging.ts";
import { createIndexedDbRosterCache, type RosterCache } from "./roster-cache.ts";

export type RosterNotice = "cache" | "catalog_unavailable";

export type ClientRosterResult = Readonly<{
  roster: LoadedRoster | null;
  source: "bundle" | "cache" | "empty";
  notice?: RosterNotice;
}>;

type RosterSource = Readonly<{
  rawRoster: unknown;
  cardNumbers: readonly CardNumber[];
  hash: string | null;
}>;

export type ClientRosterDependencies = Readonly<{
  readSource(): Promise<RosterSource>;
  cache: RosterCache;
  now(): string;
}>;

async function readHttpSource(): Promise<RosterSource> {
  const response = await fetch("/api/free-duel/roster-source");
  if (!response.ok) throw new Error("Roster source is unavailable.");
  return (await response.json()) as RosterSource;
}

const DEFAULT_DEPENDENCIES: ClientRosterDependencies = {
  readSource: readHttpSource,
  cache: createIndexedDbRosterCache(),
  now: () => new Date().toISOString(),
};

async function safeReadCache(cache: RosterCache): Promise<LoadedRoster | null> {
  try {
    return await cache.read();
  } catch {
    return null;
  }
}

export async function loadClientRoster(
  dependencies: ClientRosterDependencies = DEFAULT_DEPENDENCIES,
): Promise<ClientRosterResult> {
  let source: RosterSource;
  try {
    source = await dependencies.readSource();
  } catch {
    const cached = await safeReadCache(dependencies.cache);
    return cached === null
      ? { roster: null, source: "empty" }
      : { roster: cached, source: "cache", notice: "cache" };
  }

  if (!Array.isArray(source.cardNumbers)) {
    return { roster: null, source: "empty", notice: "catalog_unavailable" };
  }
  const knownCards = new Set(source.cardNumbers);
  const catalog: CardCatalogLookup = (cardNumber) =>
    knownCards.has(cardNumber) ? ({ numero: cardNumber } as ReturnType<CardCatalogLookup>) : undefined;
  const loaded = loadRoster(source.rawRoster, catalog);
  if (!loaded.ok) {
    log("error", "roster_invalid", { code: loaded.error.code });
    const cached = await safeReadCache(dependencies.cache);
    return cached === null
      ? { roster: null, source: "empty" }
      : { roster: cached, source: "cache", notice: "cache" };
  }

  for (const hidden of loaded.value.report.hidden) {
    log("warn", "duelist_hidden", { duelistId: hidden.id, code: hidden.code });
  }
  try {
    await dependencies.cache.write({
      rosterVersion: loaded.value.rosterVersion,
      hash: source.hash,
      validatedAt: dependencies.now(),
      roster: loaded.value,
    });
  } catch {
    log("warn", "roster_cache_unavailable");
  }
  return { roster: loaded.value, source: "bundle" };
}
