import { PendingCardRedemptionSchema } from "@yugioh/shared";
import { log } from "../logging.ts";
import { openDatabase, requestToPromise, PENDING_PASSWORD_REDEMPTIONS_STORE_NAME } from "../collection/indexeddb-cache.ts";

import type { RedemptionQueue } from "./redeem-card.ts";
export type { RedemptionQueue } from "./redeem-card.ts";
export function createIndexedDbRedemptionQueue(): RedemptionQueue { return {
  async enqueue(item) { const db=await openDatabase(); try { await requestToPromise(db.transaction(PENDING_PASSWORD_REDEMPTIONS_STORE_NAME,"readwrite").objectStore(PENDING_PASSWORD_REDEMPTIONS_STORE_NAME).put(item)); } finally { db.close(); } },
  async listPending(playerId) { const db=await openDatabase(); try { const rows=await requestToPromise(db.transaction(PENDING_PASSWORD_REDEMPTIONS_STORE_NAME).objectStore(PENDING_PASSWORD_REDEMPTIONS_STORE_NAME).getAll()) as unknown[]; return rows.flatMap((row) => { const parsed=PendingCardRedemptionSchema.safeParse(row); if (!parsed.success) { log("warn","pending_redemption_invalid",{}); return []; } return parsed.data.playerId===playerId?[parsed.data]:[]; }).sort((a,b)=>a.queuedAt.localeCompare(b.queuedAt)); } finally { db.close(); } },
  async remove(id) { const db=await openDatabase(); try { await requestToPromise(db.transaction(PENDING_PASSWORD_REDEMPTIONS_STORE_NAME,"readwrite").objectStore(PENDING_PASSWORD_REDEMPTIONS_STORE_NAME).delete(id)); } finally { db.close(); } },
}; }
