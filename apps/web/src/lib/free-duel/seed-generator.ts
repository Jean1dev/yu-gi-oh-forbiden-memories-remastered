export type SeedGenerator = () => number;

export function createCryptoSeedGenerator(
  cryptoSource: Pick<Crypto, "getRandomValues"> = globalThis.crypto,
): SeedGenerator {
  return () => {
    const values = new Uint32Array(1);
    cryptoSource.getRandomValues(values);
    return values[0] ?? 0;
  };
}

export function generateDuelSessionId(
  cryptoSource: Pick<Crypto, "randomUUID"> = globalThis.crypto,
): string {
  return cryptoSource.randomUUID();
}
