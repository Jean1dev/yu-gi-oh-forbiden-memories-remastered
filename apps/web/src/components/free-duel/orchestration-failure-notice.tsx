import type { OrchestrationFailureReason } from "@yugioh/shared";
import Link from "next/link";

export function OrchestrationFailureNotice({
  reason,
}: {
  readonly reason: OrchestrationFailureReason;
}) {
  return (
    <section role="alert">
      <p>
        {reason === "deck_rejected_by_engine"
          ? "Não foi possível iniciar o duelo (deck inválido). Verifique seu deck."
          : "Falha na IA do oponente; duelo encerrado."}
      </p>
      <Link href="/free-duel">Voltar ao menu</Link>
    </section>
  );
}
