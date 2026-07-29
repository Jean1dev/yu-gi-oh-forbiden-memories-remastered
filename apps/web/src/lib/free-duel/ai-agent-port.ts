import type { AiAgent } from "@yugioh/shared";

let connectedAgent: AiAgent | undefined;

export function connectAiAgent(agent: AiAgent): void {
  connectedAgent = agent;
}

export function getAiAgent(): AiAgent {
  if (!connectedAgent) {
    throw new Error("NPC AI agent is not connected");
  }
  return connectedAgent;
}
