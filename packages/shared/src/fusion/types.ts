import type { CardNumber } from "../card/types.ts";

export type FusionStep = Readonly<{
  material: CardNumber;
  accumulator: CardNumber;
  result: CardNumber | null;
}>;
export type FusionResolution = Readonly<{
  materials: readonly CardNumber[];
  result: CardNumber;
  steps: readonly FusionStep[];
  fused: boolean;
}>;
export type FusionPairLookup = (
  materialA: CardNumber,
  materialB: CardNumber,
) => CardNumber | undefined;
export type FusionSequenceResolver = (
  materials: readonly CardNumber[],
) => FusionResolution | undefined;
