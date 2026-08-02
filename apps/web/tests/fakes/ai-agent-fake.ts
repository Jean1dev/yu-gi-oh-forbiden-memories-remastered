import type { AiAgent, DuelAction, PublicDuelState } from "@yugioh/shared";

export function createAiAgentFake(actions: readonly DuelAction[]): AiAgent & {
  readonly receivedStates: PublicDuelState[];
} {
  const queue = [...actions];
  const receivedStates: PublicDuelState[] = [];
  return {
    receivedStates,
    async decide(state) {
      receivedStates.push(state);
      const next = queue.shift();
      if (next === undefined) throw new Error("AI fake has no action queued");
      return next;
    },
  };
}
