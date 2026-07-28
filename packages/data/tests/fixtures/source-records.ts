import type { SourceCard } from "../../src/ingestion/envelope.ts";

/**
 * Synthetic source records. Every field mirrors the real source shape: numbers
 * arrive as strings and absence arrives as an empty string or the
 * `"Indisponível"` sentinel.
 */
export function sourceCard(overrides: Partial<SourceCard> = {}): SourceCard {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: "3000",
    def: "2500",
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: "89 63 11 39",
    estrelas: "999999",
    tipo: "monstro",
    ...overrides,
  };
}

/** A `success:true` envelope, serialized the way the source stores it. */
export function successEnvelope(overrides: Partial<SourceCard> = {}): string {
  return JSON.stringify({ success: true, card: sourceCard(overrides) });
}

/** The `success:false` envelope, 99 of which exist in the real source. */
export function errorEnvelope(): string {
  return JSON.stringify({ success: false, error: "Carta não encontrada" });
}

/** An envelope claiming success but carrying no card. */
export function missingCardEnvelope(): string {
  return JSON.stringify({ success: true });
}

/** Text that is not JSON at all. */
export const MALFORMED_JSON = '{"success":true,"card":{';

/** Builds the source file entry for a card number, keeping name and record aligned. */
export function sourceFile(
  numero: string,
  overrides: Partial<SourceCard> = {},
): {
  name: string;
  content: string;
} {
  return {
    name: `${numero}.json`,
    content: successEnvelope({ id: Number(numero), numero, ...overrides }),
  };
}
