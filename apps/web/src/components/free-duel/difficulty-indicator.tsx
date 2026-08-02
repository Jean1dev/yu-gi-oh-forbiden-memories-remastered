import type { DifficultyLevel } from "@yugioh/shared";

import { DIFFICULTY_LABELS } from "../../lib/free-duel/opponent-selection-messages.ts";

export function DifficultyIndicator({ difficulty }: { difficulty: DifficultyLevel }) {
  return (
    <span aria-label={`Dificuldade: ${DIFFICULTY_LABELS[difficulty]}`}>
      Dificuldade: {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
