import {
  DomainError,
  err,
  ok,
  type PendingVictoryReward,
  type ReconciledWalletBalance,
  type Result,
} from "@yugioh/shared";

export type ReconcileWalletBalanceInput = Readonly<{
  origin: "server" | "cache";
  persistedStars: number;
  pending: readonly PendingVictoryReward[];
  appliedDuelIds: ReadonlySet<string>;
}>;

function dedupedDuelIds(pending: readonly PendingVictoryReward[]): readonly string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const reward of pending) {
    if (!seen.has(reward.duelId)) {
      seen.add(reward.duelId);
      ordered.push(reward.duelId);
    }
  }
  return ordered;
}

/**
 * Pure, total reconciliation of the wallet balance to display (spec
 * password/F01 §3): combines the persisted balance with the offline credit
 * queue, counting only the credits whose `duelId` is absent from
 * `appliedDuelIds`. `origin: "cache"` skips the ledger filter entirely — the
 * cached snapshot already includes offline credits applied to it in the same
 * IndexedDB transaction (Decision 5), so re-adding the queue would double
 * count.
 */
export function reconcileWalletBalance(
  input: ReconcileWalletBalanceInput,
): Result<ReconciledWalletBalance, DomainError> {
  const { origin, persistedStars, pending, appliedDuelIds } = input;

  if (!Number.isInteger(persistedStars) || persistedStars < 0) {
    return err(
      new DomainError("Persisted wallet balance must be a non-negative integer.", "invalid_wallet_balance", {
        persistedStars,
      }),
    );
  }

  if (origin === "cache") {
    return ok({
      persistedStars,
      pendingStars: 0,
      effectiveStars: persistedStars,
      pendingDuelIds: dedupedDuelIds(pending),
    });
  }

  const starsByDuelId = new Map<string, number>();
  for (const reward of pending) {
    if (!appliedDuelIds.has(reward.duelId) && !starsByDuelId.has(reward.duelId)) {
      starsByDuelId.set(reward.duelId, reward.stars);
    }
  }
  const pendingDuelIds = dedupedDuelIds(pending).filter((duelId) => starsByDuelId.has(duelId));
  const pendingStars = pendingDuelIds.reduce((sum, duelId) => sum + (starsByDuelId.get(duelId) ?? 0), 0);

  return ok({
    persistedStars,
    pendingStars,
    effectiveStars: persistedStars + pendingStars,
    pendingDuelIds,
  });
}
