import type { LoadedRoster } from "@yugioh/data/roster";

import {
  openDatabase,
  requestToPromise,
  ROSTER_CACHE_STORE_NAME,
} from "../collection/indexeddb-cache.ts";

const CURRENT_ROSTER_KEY = "current";

export type RosterCacheRecord = Readonly<{
  rosterVersion: string;
  hash: string | null;
  validatedAt: string;
  roster: LoadedRoster;
}>;

export type RosterCache = Readonly<{
  read(
    expected?: Readonly<{ rosterVersion: string; hash: string | null }>,
  ): Promise<LoadedRoster | null>;
  write(record: RosterCacheRecord): Promise<void>;
}>;

export function createIndexedDbRosterCache(): RosterCache {
  return {
    async read(expected) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(ROSTER_CACHE_STORE_NAME, "readonly");
        const raw = (await requestToPromise(
          transaction.objectStore(ROSTER_CACHE_STORE_NAME).get(CURRENT_ROSTER_KEY),
        )) as RosterCacheRecord | undefined;
        if (raw === undefined) return null;
        if (
          expected !== undefined &&
          (raw.rosterVersion !== expected.rosterVersion || raw.hash !== expected.hash)
        ) {
          return null;
        }
        return raw.roster;
      } finally {
        database.close();
      }
    },
    async write(record) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(ROSTER_CACHE_STORE_NAME, "readwrite");
        await requestToPromise(
          transaction.objectStore(ROSTER_CACHE_STORE_NAME).put(record, CURRENT_ROSTER_KEY),
        );
      } finally {
        database.close();
      }
    },
  };
}
