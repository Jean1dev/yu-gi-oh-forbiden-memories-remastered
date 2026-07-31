import type { WalletBalanceState } from "../../stores/wallet-store.ts";
import { PASSWORD_MESSAGES } from "./messages.ts";
import styles from "./password.module.css";

export type StarBalanceProps = Readonly<{ state: WalletBalanceState }>;

export function StarBalance({ state }: StarBalanceProps) {
  if (state.status === "ready") {
    return (
      <header className={styles.balance}>
        <strong>Saldo: {state.loaded.effectiveStars.toLocaleString("pt-BR")}⭐</strong>
        {state.loaded.origin === "cache" ? (
          <span className={styles.notice}>{PASSWORD_MESSAGES.cacheNotice}</span>
        ) : null}
      </header>
    );
  }

  if (state.status === "unavailable") {
    const message =
      state.error.code === "session_missing"
        ? PASSWORD_MESSAGES.sessionMissing
        : PASSWORD_MESSAGES.walletUnavailable;
    return <header className={styles.balance}>{message}</header>;
  }

  return <header className={styles.balance}>Carregando saldo…</header>;
}
