/**
 * Single map from state to the text shown to the player, the same convention
 * `components/build-deck/messages.ts` and `components/library/messages.ts`
 * follow — one phrasing per condition, reused instead of re-invented.
 */
export const LOGIN_MESSAGES = {
  title: "Entrar",
  emailLabel: "E-mail",
  passwordLabel: "Senha",
  signIn: "Entrar",
  signUp: "Criar conta",
  guestCta: "Continuar como convidado",
  working: "Aguarde…",
  preparingDeck: "Preparando seu deck inicial…",
  invalidCredentials: "E-mail ou senha inválidos.",
  signUpFailed: "Não foi possível criar a conta.",
  guestFailed: "Não foi possível continuar como convidado.",
  bootstrapFailed:
    "Sua conta foi criada, mas não foi possível preparar o deck inicial. Tente entrar novamente.",
  misconfigured:
    "Configuração do Supabase ausente. Copie apps/web/.env.local.example para apps/web/.env.local e reinicie o servidor.",
  back: "◀ Voltar ao menu",
  hint: "Contas novas recebem automaticamente um deck de 40 cartas.",
  guestHint:
    "Jogando como convidado, seu progresso fica só neste navegador até você vincular um e-mail.",
} as const;
