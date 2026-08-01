"use client";

import { useRouter } from "next/navigation";
import styles from "./duel-unavailable-notice.module.css";

export function DuelUnavailableNotice() {
  const router = useRouter();
  return (
    <main className={styles.page}>
      <section className={styles.notice} aria-labelledby="duel-unavailable-title">
        <h1 id="duel-unavailable-title">Duelo indisponível</h1>
        <p>Não foi possível carregar o catálogo de cartas para iniciar esta partida.</p>
        <button type="button" onClick={() => router.refresh()}>
          Recarregar
        </button>
      </section>
    </main>
  );
}
