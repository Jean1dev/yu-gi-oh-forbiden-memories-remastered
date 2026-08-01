import { DomainError, err, ok } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("../supabase/client.ts", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => ({})),
}));
vi.mock("./ensure-initial-deck.ts", () => ({
  ensureInitialDeck: vi.fn(),
}));
vi.mock("../wallet/ensure-wallet.ts", () => ({
  createSupabaseEnsureWalletRepository: vi.fn(),
}));

import { onAccountCreated } from "./on-account-created.ts";
import { ensureInitialDeck } from "./ensure-initial-deck.ts";
import { createSupabaseEnsureWalletRepository } from "../wallet/ensure-wallet.ts";

const deckResult = ok({ deck: new Map([["001", 3]]), createdNow: true });
const initialDeck = { deck: new Map([["001", 3]]), createdNow: true };

describe("onAccountCreated", () => {
  it("ensures the wallet with INITIAL_WALLET_STARS after seeding the initial deck", async () => {
    const ensure = vi.fn().mockResolvedValue(ok({ stars: 0, createdNow: true }));
    vi.mocked(ensureInitialDeck).mockResolvedValue(deckResult);
    vi.mocked(createSupabaseEnsureWalletRepository).mockReturnValue({ ensure });

    const result = await onAccountCreated("player-1");

    expect(ensure).toHaveBeenCalledWith("player-1", 0);
    expect(result).toEqual(ok({ initialDeck, wallet: { stars: 0, createdNow: true } }));
  });

  it("reports walletCreatedNow false on a second call for the same player", async () => {
    vi.mocked(ensureInitialDeck).mockResolvedValue(ok({ deck: new Map(), createdNow: false }));
    vi.mocked(createSupabaseEnsureWalletRepository).mockReturnValue({
      ensure: vi.fn().mockResolvedValue(ok({ stars: 12, createdNow: false })),
    });

    const result = await onAccountCreated("player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.wallet).toEqual({ stars: 12, createdNow: false });
  });

  it("returns an error when ensuring the wallet fails without ever touching the initial deck result", async () => {
    vi.mocked(ensureInitialDeck).mockResolvedValue(deckResult);
    const failure = err(new DomainError("boom", "wallet_bootstrap_failed"));
    vi.mocked(createSupabaseEnsureWalletRepository).mockReturnValue({ ensure: vi.fn().mockResolvedValue(failure) });

    const result = await onAccountCreated("player-1");

    expect(result).toEqual(failure);
  });

  it("returns an error and never ensures the wallet when the initial deck fails", async () => {
    const failure = err(new DomainError("boom", "initial_deck_unavailable"));
    vi.mocked(ensureInitialDeck).mockResolvedValue(failure);
    const ensure = vi.fn();
    vi.mocked(createSupabaseEnsureWalletRepository).mockReturnValue({ ensure });

    const result = await onAccountCreated("player-1");

    expect(result).toEqual(failure);
    expect(ensure).not.toHaveBeenCalled();
  });
});
