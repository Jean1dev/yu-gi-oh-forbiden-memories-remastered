/**
 * The seven main-menu options of `product.md`, in the game's own order.
 *
 * `status` records what actually exists in this repository today, so the menu
 * never offers a screen that is not there. A module graduates to `"ready"` when
 * its route exists — that is the single edit a future PRD has to make here.
 */
export type MenuItemStatus = "ready" | "soon";

export type MenuItem = Readonly<{
  id: string;
  label: string;
  description: string;
  href: string | undefined;
  status: MenuItemStatus;
}>;

export const MENU_ITEMS: readonly MenuItem[] = [
  {
    id: "campanha",
    label: "Campanha",
    description: "Progrida pelos duelistas e conquiste novas cartas.",
    href: undefined,
    status: "soon",
  },
  {
    id: "free-duel",
    label: "Free Duel",
    description: "Duele contra um oponente controlado pela máquina.",
    href: undefined,
    status: "soon",
  },
  {
    id: "online-duel",
    label: "Online Duel",
    description: "Duele contra outro jogador.",
    href: undefined,
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
    href: undefined,
    status: "soon",
  },
  {
    id: "save",
    label: "Save",
    description: "Salve e carregue seu progresso.",
    href: undefined,
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
  misconfigured:
    "Configuração do Supabase ausente. Copie apps/web/.env.local.example para apps/web/.env.local e reinicie o servidor.",
} as const;
