import { PendingVictoryRewardSchema, type PendingVictoryReward } from "@yugioh/shared";

import {
  openDatabase,
  PENDING_VICTORY_REWARDS_STORE_NAME,
  requestToPromise,
} from "../collection/indexeddb-cache.ts";

export type VictoryRewardQueue = Readonly<{
  enqueueReward(reward: PendingVictoryReward): Promise<void>;
  listPendingRewards(playerId: string): Promise<readonly PendingVictoryReward[]>;
  removePendingReward(duelId: string): Promise<void>;
}>;

export function createIndexedDbVictoryRewardQueue(): VictoryRewardQueue {
  return {
    async enqueueReward(reward) {
      const database = await openDatabase();
      try {
        await requestToPromise(
          database
            .transaction(PENDING_VICTORY_REWARDS_STORE_NAME, "readwrite")
            .objectStore(PENDING_VICTORY_REWARDS_STORE_NAME)
            .put(reward),
        );
      } finally {
        database.close();
      }
    },
    async listPendingRewards(playerId) {
      const database = await openDatabase();
      try {
        const records = await requestToPromise<unknown[]>(
          database
            .transaction(PENDING_VICTORY_REWARDS_STORE_NAME, "readonly")
            .objectStore(PENDING_VICTORY_REWARDS_STORE_NAME)
            .getAll(),
        );
        const pending: PendingVictoryReward[] = [];
        for (const record of records) {
          const parsed = PendingVictoryRewardSchema.safeParse(record);
          if (parsed.success && parsed.data.playerId === playerId) pending.push(parsed.data);
        }
        return pending.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
      } finally {
        database.close();
      }
    },
    async removePendingReward(duelId) {
      const database = await openDatabase();
      try {
        await requestToPromise(
          database
            .transaction(PENDING_VICTORY_REWARDS_STORE_NAME, "readwrite")
            .objectStore(PENDING_VICTORY_REWARDS_STORE_NAME)
            .delete(duelId),
        );
      } finally {
        database.close();
      }
    },
  };
}
