/**
 * Synthetic terrain↔class matrix sources for banco-de-cartas/F07.
 *
 * Every value here is fictitious (spec F07, Decision 9): they exercise the
 * structure/duplicate/contradiction/reference logic and never approximate
 * the real classic table, which does not exist in this repository yet.
 */

function entry(
  terreno: string,
  classesFortalecidas: readonly string[],
  classesEnfraquecidas: readonly string[],
  magnitudeFortalecimento = 500,
  magnitudeEnfraquecimento = 500,
): Record<string, unknown> {
  return {
    terreno,
    classesFortalecidas,
    classesEnfraquecidas,
    magnitudeFortalecimento,
    magnitudeEnfraquecimento,
  };
}

export function emptyMatrixSource(): unknown {
  return [];
}

export function unknownClassMatrixSource(): unknown {
  return [entry("TerrenoExemploA", ["NoSuchClass"], [])];
}

export function validMatrixSource(monsterClasse: string): unknown {
  return [entry("TerrenoExemploA", [monsterClasse], [])];
}
