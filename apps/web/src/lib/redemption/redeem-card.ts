import { CardRedemptionIntentSchema, DomainError, err, ok, type CardRedemptionOutcome, type Result } from "@yugioh/shared";
import type { Clock } from "../collection/load-collection.ts";
import type { RedemptionRepository } from "./redemption-repository.ts";

export type IdGenerator = Readonly<{ newId(): string }>;
export type RedemptionQueue = Readonly<{ enqueue(item: import("@yugioh/shared").PendingCardRedemption): Promise<void>; listPending(playerId: string): Promise<readonly import("@yugioh/shared").PendingCardRedemption[]>; remove(redemptionId: string): Promise<void> }>;
export type RedeemCardDeps = Readonly<{ repository: RedemptionRepository; queue: RedemptionQueue; clock: Clock; ids: IdGenerator }>;
export async function redeemCardByPassword(intent: unknown, deps: RedeemCardDeps): Promise<Result<CardRedemptionOutcome, DomainError>> {
  const parsed=CardRedemptionIntentSchema.safeParse(intent); if (!parsed.success) return err(new DomainError("Invalid redemption intent.","invalid_redemption_intent"));
  const result=await deps.repository.redeem(parsed.data);
  if (result.ok || result.error.code !== "redemption_unavailable") return result;
  const queuedAt=deps.clock.now().toISOString();
  try { await deps.queue.enqueue({...parsed.data,queuedAt,attempts:0}); return ok({status:"queued_offline",redemptionId:parsed.data.redemptionId,queuedAt}); }
  catch { return err(new DomainError("Redemption and offline queue are unavailable.","redemption_unavailable")); }
}
