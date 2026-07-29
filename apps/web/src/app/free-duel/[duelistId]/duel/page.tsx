import { DuelScreen } from "./duel-screen.tsx";

export default async function DuelPage({ params }: { params: Promise<{ duelistId: string }> }) {
  return <DuelScreen duelistId={(await params).duelistId} />;
}
