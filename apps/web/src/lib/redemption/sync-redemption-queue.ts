import type { CardRedemptionOutcome } from "@yugioh/shared";
import type { RedeemCardDeps } from "./redeem-card.ts";
export async function syncRedemptionQueue(deps: { playerId: string; onOutcome?: (outcome: CardRedemptionOutcome)=>void } & RedeemCardDeps) {
  const pending=await deps.queue.listPending(deps.playerId); let applied=0,removed=0;
  for (const item of pending) { const result=await deps.repository.redeem(item); if (!result.ok) continue; deps.onOutcome?.(result.value); if (result.value.status!=="queued_offline") { await deps.queue.remove(item.redemptionId); removed++; if (result.value.status==="applied"||result.value.status==="already_applied") applied++; } }
  return {applied,removed,remaining:pending.length-removed};
}
