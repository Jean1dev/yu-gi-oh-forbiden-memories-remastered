import { DomainError, err, ok, type RedemptionEligibility, type RedemptionLedgerState, type Result } from "@yugioh/shared";

const validAmount = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;
const invalidAmount = () => new DomainError("Redemption amounts must be non-negative safe integers", "invalid_redemption_amount");

export function evaluateRedemptionEligibility(input: { priceStars: number; balanceStars: number | undefined; thresholdStars: number | null }): Result<RedemptionEligibility, DomainError> {
  if (!validAmount(input.priceStars) || (input.balanceStars !== undefined && !validAmount(input.balanceStars)) || (input.thresholdStars !== null && !validAmount(input.thresholdStars))) return err(invalidAmount());
  if (input.balanceStars === undefined) return ok({ status: "blocked_unknown_balance", priceStars: input.priceStars });
  if (input.balanceStars < input.priceStars) return ok({ status: "blocked_insufficient", priceStars: input.priceStars, balanceStars: input.balanceStars, missingStars: input.priceStars - input.balanceStars });
  if (input.thresholdStars !== null && input.priceStars >= input.thresholdStars) return ok({ status: "needs_confirmation", priceStars: input.priceStars, balanceStars: input.balanceStars, thresholdStars: input.thresholdStars });
  return ok({ status: "ready", priceStars: input.priceStars, balanceStars: input.balanceStars });
}

export function applyRedemptionDebit(balanceStars: number, priceStars: number): Result<number, DomainError> {
  if (!validAmount(balanceStars) || !validAmount(priceStars) || balanceStars < priceStars) return err(invalidAmount());
  return ok(balanceStars - priceStars);
}

export function applyRedemptionToLedger(state: RedemptionLedgerState, intent: { redemptionId: string; priceStars: number }): Result<{ state: RedemptionLedgerState; applied: boolean }, DomainError> {
  if (!validAmount(state.balanceStars) || !intent.redemptionId) return err(invalidAmount());
  if (state.appliedRedemptionIds.includes(intent.redemptionId)) return ok({ state, applied: false });
  const debit = applyRedemptionDebit(state.balanceStars, intent.priceStars);
  if (!debit.ok) return debit;
  return ok({ state: { balanceStars: debit.value, appliedRedemptionIds: [...state.appliedRedemptionIds, intent.redemptionId] }, applied: true });
}
