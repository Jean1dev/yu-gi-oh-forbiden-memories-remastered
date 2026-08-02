import type { DifficultyLevel } from "@yugioh/shared";

/**
 * Copy for the opponent-selection screen (free-duel/F01), pulled verbatim from
 * the PRD's own error-handling table (spec F01 §6) instead of inventing new
 * phrasing for the same conditions.
 */
export const OPPONENT_SELECTION_MESSAGES = {
  title: "Free Duel",
  backToMenu: "◀ Voltar ao menu",
  instruction: "Selecione um oponente!",
  loading: "Carregando duelistas…",
  duelistListLabel: "Duelistas disponíveis",
  noOpponentSelected: "Nenhum oponente selecionado",
  startDuel: "Iniciar Duelo",
  emptyRoster: "Nenhum duelista disponível. A lista de oponentes ainda não foi configurada.",
  cacheNotice: "Lista de duelistas carregada do cache; pode estar desatualizada.",
  unavailableTitle: "Free Duel indisponível",
  unavailableMessage: "Não foi possível carregar o banco de cartas. Tente novamente.",
  retry: "Tentar novamente",
  portraitUnavailable: "Retrato indisponível",
} as const;

export const DIFFICULTY_LABELS: Readonly<Record<DifficultyLevel, string>> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
};
