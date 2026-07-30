import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError, err, ok, type Result, type WalletBalance } from "@yugioh/shared";

export type WalletRepository = Readonly<{
  load(playerId: string): Promise<Result<WalletBalance, DomainError>>;
}>;

export function createSupabaseWalletRepository(client: SupabaseClient): WalletRepository {
  return {
    async load(playerId) {
      const { data, error } = await client
        .from("wallets")
        .select("player_id,stars")
        .eq("player_id", playerId)
        .maybeSingle();
      if (error) {
        return err(new DomainError(error.message, "wallet_unavailable", { playerId }));
      }
      const row: unknown = data ?? { player_id: playerId, stars: 0 };
      if (
        typeof row !== "object" ||
        row === null ||
        Reflect.get(row, "player_id") !== playerId ||
        !Number.isInteger(Reflect.get(row, "stars")) ||
        (Reflect.get(row, "stars") as number) < 0
      ) {
        return err(new DomainError("Wallet response failed validation.", "wallet_unavailable", { playerId }));
      }
      return ok({ playerId, stars: Reflect.get(row, "stars") as number });
    },
  };
}
