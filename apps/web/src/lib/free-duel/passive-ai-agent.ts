import type { AiAgent, DuelAction } from "@yugioh/shared";

const DEFAULT_PASSIVE_AI_DELAY_MS = 650;

export type PassiveAiAgentOptions = Readonly<{
  sleep?: ((ms: number) => Promise<void>) | undefined;
  delayMs?: number | undefined;
}>;

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function createPassiveAiAgent(options: PassiveAiAgentOptions = {}): AiAgent {
  const sleep = options.sleep ?? defaultSleep;
  const delayMs = options.delayMs ?? DEFAULT_PASSIVE_AI_DELAY_MS;
  return {
    async decide(): Promise<DuelAction> {
      await sleep(delayMs);
      return { type: "advance_phase" };
    },
  };
}
