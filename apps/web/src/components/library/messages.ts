/**
 * Single map from state/error code to the text shown to the player (spec
 * library/F02 §3), so F03, F04 and F05 reuse the same wording instead of
 * inventing a second phrasing for the same condition.
 */
export const LIBRARY_MESSAGES = {
  catalogUnavailable: "Não foi possível carregar as cartas. Tente novamente.",
  collectionUnavailable: "Não foi possível carregar sua coleção. Tente novamente.",
  sessionMissing: "Faça login para ver sua coleção.",
  cacheNotice: "Coleção carregada do cache; algumas cartas podem estar desatualizadas.",
  emptyCollection:
    "Você ainda não obteve nenhuma carta. Vença duelos ou use senhas para começar sua coleção.",
  cardNotFound: "Carta não encontrada.",
  cardNotObtained: "Carta ainda não obtida",
} as const;
