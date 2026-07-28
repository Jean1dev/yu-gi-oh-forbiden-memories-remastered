/**
 * Synthetic Guardian Star matrix sources for banco-de-cartas/F06.
 *
 * Every value here is fictitious (spec F06, Decision 13): they exercise the
 * normalization/indexing/coverage logic and never approximate the real
 * classic table, which does not exist in this repository yet.
 */

function entry(
  atacante: string,
  defensor: string,
  resultado: string,
  bonusAtaque: number,
): Record<string, unknown> {
  return { atacante, defensor, resultado, bonusAtaque };
}

export function emptySource(): unknown {
  return [];
}

export function validSource(): unknown {
  return [
    entry("Sun", "Sun", "neutro", 0),
    entry("Sun", "Moon", "vantagem", 10),
    entry("Moon", "Sun", "desvantagem", 10),
  ];
}

export function duplicatePairSource(): unknown {
  return [entry("Sun", "Moon", "vantagem", 10), entry("Sun", "Moon", "neutro", 0)];
}

export function incoherentEntrySource(): unknown {
  return [entry("Sun", "Moon", "neutro", 5)];
}

export function unknownGuardianSource(): unknown {
  return [entry("Sunlight", "Moon", "vantagem", 10)];
}
