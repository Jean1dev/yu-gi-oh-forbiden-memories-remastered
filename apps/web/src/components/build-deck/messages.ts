/**
 * Single map from state/error code to the text shown to the player, reusing
 * the wording build-deck/F01 and library/F02 already settled on for the same
 * situations (spec build-deck/F04 §6, Decision 13) instead of inventing a
 * third phrasing for the same condition.
 */
export const BUILD_DECK_MESSAGES = {
  collectionUnavailable: "Não foi possível carregar sua coleção. Tente novamente.",
  sessionMissing: "Faça login para ver sua coleção.",
  catalogUnavailable: "Não foi possível carregar o catálogo de cartas. Tente novamente.",
  cacheNotice: "Coleção carregada do cache; algumas cartas podem estar desatualizadas.",
  emptyCollection:
    "Você ainda não possui cartas. Vença duelos ou use senhas para começar sua coleção.",
  limitReached: "Limite atingido",
} as const;

export function noSearchResultsMessage(term: string): string {
  return `Nenhuma carta encontrada para "${term}".`;
}
