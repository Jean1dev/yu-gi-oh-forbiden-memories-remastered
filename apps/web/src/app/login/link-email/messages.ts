/**
 * Single map from state to the text shown to the player, the same convention
 * `app/login/messages.ts` and `components/build-deck/messages.ts` follow.
 */
export const LINK_EMAIL_MESSAGES = {
  title: "Vincular e-mail",
  intro: "Adicione um e-mail e senha para acessar sua coleção de qualquer aparelho.",
  emailLabel: "E-mail",
  passwordLabel: "Senha",
  submit: "Vincular",
  working: "Vinculando…",
  success: "E-mail vinculado! Seu progresso já está protegido.",
  pendingConfirmation:
    "Enviamos um link de confirmação para o seu e-mail. Confirme para concluir a vinculação.",
  emailInUse: "Este e-mail já está em uso.",
  failed: "Não foi possível vincular o e-mail. Tente novamente.",
  notGuest: "Esta tela é só para quem está jogando como convidado.",
  loadingSession: "Carregando sessão…",
  misconfigured:
    "Configuração do Supabase ausente. Copie apps/web/.env.local.example para apps/web/.env.local e reinicie o servidor.",
  back: "◀ Voltar ao menu",
} as const;
