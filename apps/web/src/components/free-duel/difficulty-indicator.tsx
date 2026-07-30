import type { DifficultyLevel } from "@yugioh/shared";

const LABELS: Readonly<Record<DifficultyLevel, string>> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function DifficultyIndicator({ difficulty }: { difficulty: DifficultyLevel }) {
  return <span aria-label={`Difficulty: ${LABELS[difficulty]}`}>{LABELS[difficulty]}</span>;
}
