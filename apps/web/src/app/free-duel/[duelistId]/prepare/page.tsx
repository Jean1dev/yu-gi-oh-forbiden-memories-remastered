import { DuelPreparation } from "./duel-preparation.tsx";

export default async function PreparePage({ params }: { params: Promise<{ duelistId: string }> }) {
  return <DuelPreparation duelistId={(await params).duelistId} />;
}
