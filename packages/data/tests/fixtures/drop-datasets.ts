/**
 * Synthetic drop-table sources for banco-de-cartas/F08.
 *
 * Every value here is fictitious (spec F08, Decision 3): they exercise the
 * schema/aggregation/reference logic and never approximate the real drop
 * pools by duelist, which do not exist in this repository yet.
 */

function entrada(
  numero: string,
  probabilidade: number,
  condicao?: string,
): Record<string, unknown> {
  return condicao === undefined ? { numero, probabilidade } : { numero, probabilidade, condicao };
}

function pool(duelista: string, entradas: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { duelista, entradas };
}

export function emptyDropSource(): unknown {
  return [];
}

/** Uses `numero` "001", real in the shared catalog fixture (F03). */
export function validDropSource(): unknown {
  return [pool("duelista-exemplo-01", [entrada("001", 1), entrada("002", 4, "vitoria_modo_dificil")])];
}

export function duplicateDuelistaSource(): unknown {
  return [pool("duelista-exemplo-01", [entrada("001", 1)]), pool("duelista-exemplo-01", [entrada("002", 1)])];
}

export function unknownNumeroSource(): unknown {
  return [pool("duelista-exemplo-01", [entrada("999", 1)])];
}
