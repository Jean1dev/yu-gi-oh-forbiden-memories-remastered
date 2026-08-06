import type { DifficultyProfile, DuelAction, PublicDuelState } from "@yugioh/shared";

export type StrategyContext = Readonly<{
  state: PublicDuelState;
  parameters: DifficultyProfile["parameters"];
}>;

export type StrategyPolicy = Readonly<{
  name: string;
  decide(context: StrategyContext): DuelAction | Promise<DuelAction>;
}>;

export type StrategyRegistry = Readonly<{
  resolve(strategy: string): StrategyPolicy | undefined;
  names(): readonly string[];
}>;

export type AiLogger = Readonly<{
  warn(event: string, context: Readonly<Record<string, unknown>>): void;
  error?(event: string, context: Readonly<Record<string, unknown>>): void;
}>;
