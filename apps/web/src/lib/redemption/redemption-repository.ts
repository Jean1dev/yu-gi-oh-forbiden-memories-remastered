import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError, RedeemCardResponseSchema, err, ok, type CardRedemptionIntent, type CardRedemptionOutcome, type Result } from "@yugioh/shared";

export type RedemptionRepository = Readonly<{ redeem(intent: CardRedemptionIntent): Promise<Result<CardRedemptionOutcome, DomainError>> }>;
export function createSupabaseRedemptionRepository(client: SupabaseClient): RedemptionRepository {
  return { async redeem(intent) {
    try {
      const { data, error } = await client.rpc("redeem_card_by_password", { p_player_id: intent.playerId, p_redemption_id: intent.redemptionId, p_password: intent.password, p_expected_numero: intent.expectedCardNumber, p_expected_stars: intent.expectedStars });
      if (error) return err(new DomainError(error.message, error.code === "PGRST301" ? "session_missing" : "redemption_unavailable"));
      const parsed = RedeemCardResponseSchema.safeParse(Array.isArray(data) ? data[0] : data);
      if (!parsed.success) return err(new DomainError("Redemption response failed validation.", "redemption_response_invalid", { issues: parsed.error.issues }));
      const row = parsed.data;
      if (row.status === "unknown_password") return ok({ status: "unknown_password", expectedCardNumber: intent.expectedCardNumber });
      if (row.status === "preview_mismatch") return ok({ status: "preview_mismatch", authoritativeCardNumber: row.card_numero!, authoritativeStars: row.stars_spent! });
      if (row.status === "insufficient_stars") return ok({ status: "insufficient_stars", priceStars: row.stars_spent!, balanceStars: row.wallet_stars!, missingStars: row.stars_spent! - row.wallet_stars! });
      if (row.status === "already_applied") return ok({ status: "already_applied", cardNumber: row.card_numero!, starsSpent: row.stars_spent!, walletStars: row.wallet_stars!, cardQuantity: row.card_quantity! });
      return ok({ status: "applied", cardNumber: row.card_numero!, starsSpent: row.stars_spent!, walletStars: row.wallet_stars!, cardQuantity: row.card_quantity!, redeemedAt: row.redeemed_at! });
    } catch (cause) { return err(new DomainError("Redemption RPC failed.", "redemption_unavailable", { cause: String(cause) })); }
  } };
}
