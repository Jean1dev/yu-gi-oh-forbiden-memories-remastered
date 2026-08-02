/**
 * One of the seven main-menu options of `product.md`.
 *
 * A module either has a route or it does not — modelled as one union rather
 * than a `status` flag beside an optional `href`, which would let the two
 * disagree and force every reader to re-check both. `status` records what
 * actually exists in this repository today, so the menu never offers a screen
 * that is not there; a module graduates to `"ready"` by gaining an `href`,
 * which is the single edit a future PRD has to make here.
 */
export type MenuItem = Readonly<{ id: string; label: string; description: string }> &
  (Readonly<{ status: "ready"; href: string }> | Readonly<{ status: "soon" }>);

/** In the game's own order. */
export const MENU_ITEMS: readonly MenuItem[] = [
  {
    id: "campanha",
    label: "Campanha",
    description: "Progrida pelos duelistas e conquiste novas cartas.",
    status: "soon",
  },
  {
    id: "free-duel",
    label: "Free Duel",
    description: "Duele contra um oponente controlado pela máquina.",
    status: "soon",
  },
  {
    id: "online-duel",
    label: "Online Duel",
    description: "Duele contra outro jogador.",
    status: "soon",
  },
  {
    id: "build-deck",
    label: "Build Deck",
    description: "Monte seu deck de 40 cartas a partir da sua coleção.",
    href: "/build-deck",
    status: "ready",
  },
  {
    id: "library",
    label: "Library",
    description: "Consulte as 722 cartas e acompanhe seu progresso.",
    href: "/library",
    status: "ready",
  },
  {
    id: "password",
    label: "Password",
    description: "Resgate cartas pelo código de 8 dígitos.",
    status: "ready",
    href: "/password",
  },
  {
    id: "save",
    label: "Save",
    description: "Salve e carregue seu progresso.",
    status: "soon",
  },
];

export const MENU_MESSAGES = {
  title: "Forbidden Memories",
  subtitle: "Remastered",
  soonBadge: "Em breve",
  loadingSession: "Carregando sessão…",
  signedOutPrompt: "Entre para acessar sua coleção e seu deck.",
  signIn: "Entrar",
  signOut: "Sair",
  guestPrompt: "Você está jogando como convidado. Vincule um e-mail para não perder seu progresso.",
  linkEmail: "Vincular e-mail",
  misconfigured:
    "Configuração do Supabase ausente. Copie apps/web/.env.local.example para apps/web/.env.local e reinicie o servidor.",
} as const;
