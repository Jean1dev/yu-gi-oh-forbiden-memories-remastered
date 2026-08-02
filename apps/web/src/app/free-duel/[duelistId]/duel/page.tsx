import { DuelScreen } from "./duel-screen.tsx";
import { getSealedCatalog, listAllCards } from "../../../../lib/catalog/sealed-catalog.ts";

export default async function DuelPage({ params }: { params: Promise<{ duelistId: string }> }) {
  const catalog = await getSealedCatalog();
  const catalogResult = catalog.ok
    ? { status: "ready" as const, cards: listAllCards(catalog.value) }
    : { status: "error" as const };
  return <DuelScreen duelistId={(await params).duelistId} catalogResult={catalogResult} />;
}
