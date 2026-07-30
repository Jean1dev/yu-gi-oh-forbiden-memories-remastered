import Link from "next/link";
import {
  buildRematchHref,
  MAIN_MENU_HREF,
  OPPONENT_SELECTION_HREF,
} from "../../lib/free-duel/post-duel-routes.ts";

export function PostDuelActions({ duelistId }: { readonly duelistId: string }) {
  return (
    <nav aria-label="Ações pós-duelo">
      <Link href={buildRematchHref(duelistId)}>Revanche</Link>
      <Link href={OPPONENT_SELECTION_HREF}>Trocar oponente</Link>
      <Link href={MAIN_MENU_HREF}>Voltar ao menu</Link>
    </nav>
  );
}
