export const OPPONENT_SELECTION_HREF = "/free-duel";
export const MAIN_MENU_HREF = "/";

export function buildRematchHref(duelistId: string): string {
  return `/free-duel/${duelistId}/prepare`;
}
