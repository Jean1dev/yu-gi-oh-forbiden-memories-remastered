import type { ConsolidatedDuelResult, DecisiveDuelEndReason } from "@yugioh/shared";

export const RATING_FALLBACK_MESSAGE =
  "Não foi possível avaliar a nota; recompensa mínima aplicada.";
export const RESULT_UNAVAILABLE_MESSAGE = "Não foi possível apurar o resultado do duelo.";

function decisiveReasonMessage(
  reason: DecisiveDuelEndReason,
  resultStatus: "victory" | "defeat",
): string {
  if (reason === "rendicao") {
    return resultStatus === "victory"
      ? "O oponente se rendeu."
      : "Você se rendeu.";
  }
  if (reason === "deck_out") {
    return resultStatus === "victory"
      ? "O oponente ficou sem cartas para comprar."
      : "Você ficou sem cartas para comprar.";
  }
  return resultStatus === "victory"
    ? "Os LP do oponente chegaram a 0."
    : "Seus LP chegaram a 0.";
}

export function getDuelResultTitle(result: ConsolidatedDuelResult): string {
  if (result.status === "victory") return "Vitória!";
  if (result.status === "defeat") return "Derrota";
  if (result.status === "draw") return "Empate";
  return "Resultado indisponível";
}

export function getDuelResultReasonMessage(result: ConsolidatedDuelResult): string {
  if (result.status === "unavailable") return RESULT_UNAVAILABLE_MESSAGE;
  if (result.status === "draw") return "O duelo terminou empatado.";
  return decisiveReasonMessage(result.reason, result.status);
}

