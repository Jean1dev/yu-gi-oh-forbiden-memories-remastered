import type {
  CardNumber,
  FusionPairLookup,
  FusionResolution,
  FusionSequenceResolver,
  FusionStep,
} from "@yugioh/shared";

export function createFusionSequenceResolver(lookupPair: FusionPairLookup): FusionSequenceResolver {
  return (materials): FusionResolution | undefined => {
    if (materials.length < 2 || materials.length > 5) return undefined;
    let accumulator = materials[0] as CardNumber;
    let fused = false;
    const steps: FusionStep[] = [];
    for (const material of materials.slice(1)) {
      const result = lookupPair(accumulator, material);
      steps.push({ accumulator, material, result: result ?? null });
      accumulator = result ?? material;
      fused ||= result !== undefined;
    }
    return Object.freeze({
      materials: Object.freeze([...materials]),
      result: accumulator,
      steps: Object.freeze(steps),
      fused,
    });
  };
}
