import type { CardType } from "@yugioh/shared";

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
  /** Inherited from build-deck/F02 (PRD §6 F02 Error Handling) for the window between account creation and the active deck existing. */
  preparingInitialDeck: "Preparando seu deck inicial…",
  cardNotOwned: "Carta não está na sua coleção.",
  maxCopiesLimit: "Máximo de 3 cópias por carta.",
  addCardPrompt: "Selecione uma carta na coleção para adicionar.",
  confirmLeaveWithUnsavedChanges: "Você tem alterações não salvas. Sair sem salvar?",
  /** build-deck/F07 §6: deck inválido recusado tanto por F06 quanto pela RPC (defesa em profundidade). */
  deckSaveRefused: "Deck inválido: exatamente 40 cartas, máx. 3 cópias, apenas cartas possuídas.",
  deckSaved: "Deck salvo.",
  deckSavedOffline: "Salvo offline — sincronizando quando a conexão voltar.",
  deckSynced: "Deck sincronizado.",
  deckSaveSessionExpired: "Faça login novamente para sincronizar seu deck.",
  deckSavePersistenceUnavailable: "Não foi possível salvar seu deck agora. Tente novamente.",
  deckSaving: "Salvando…",
  deckConflictNotice: "Seu deck foi atualizado em outro dispositivo; a versão mais recente foi mantida.",
  saveDeckButton: "Salvar deck",
  tabAllCards: "Todas as Cartas",
  viewList: "Lista",
  viewGrid: "Grade",
  allCardTypes: "Todos",
  allMonsterClasses: "Todos",
  emptyFilterResult: "Nenhuma carta desse tipo na sua coleção.",
  emptyDeckTab: 'Nenhuma carta no deck ainda — vá em "Todas as Cartas" para adicionar.',
} as const;

/** Card-type filter labels — covers all five `CardType` values plus the "todos" filter. */
export const CARD_TYPE_LABELS: Readonly<Record<CardType, string>> = {
  monstro: "Monstro",
  magica: "Mágica",
  armadilha: "Armadilha",
  equipamento: "Equipamento",
  ritual: "Ritual",
};

export function noSearchResultsMessage(term: string): string {
  return `Nenhuma carta encontrada para "${term}".`;
}

/** build-deck/F05 §6: the one dynamic block message — needs how many copies the player owns. */
export function ownedQuantityLimitMessage(quantityOwned: number): string {
  return `Você possui apenas ${quantityOwned} cópia(s) desta carta.`;
}

export function tabMyDeckLabel(total: number): string {
  return `Meu Deck (${total})`;
}
