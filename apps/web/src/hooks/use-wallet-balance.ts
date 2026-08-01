"use client";

import { useEffect } from "react";

import { useWalletStore, type WalletBalanceState } from "../stores/wallet-store.ts";

export function useWalletBalance(): WalletBalanceState {
  const state = useWalletStore((store) => store.state);
  const load = useWalletStore((store) => store.load);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
