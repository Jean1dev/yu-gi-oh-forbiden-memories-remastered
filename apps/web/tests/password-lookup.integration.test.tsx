// @vitest-environment jsdom
import { resolvePasswordEntry } from "@yugioh/rules";
import { describe, expect, it } from "vitest";
import { getPasswordCatalog } from "../src/lib/password/catalog-password.ts";
import { fromPasswordPayload, toPasswordPayload } from "../src/lib/password/catalog-payload.ts";

const WITHOUT_PASSWORD = new Set(["356", "360", "364", "365", "374", "380", "701", "702", "703", "704", "705", "706", "708", "709", "710", "713", "715", "716", "717", "718", "719", "720", "721", "722"]);

describe("password lookup against the sealed catalog", () => {
  it("resolves all 698 password cards without collisions and excludes the 24 unavailable cards", async () => {
    const result = await getPasswordCatalog();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = toPasswordPayload(result.value);
    expect(payload.status).toBe("ok");
    if (payload.status !== "ok") return;
    expect(payload.cards).toHaveLength(698);
    expect(payload.cards.some((card) => WITHOUT_PASSWORD.has(card.numero))).toBe(false);
    const hydrated = fromPasswordPayload(payload);
    expect(hydrated).toBeDefined();
    for (const card of payload.cards) {
      expect(card.password).not.toBeNull();
      expect(hydrated?.lookup(card.password!)?.numero).toBe(card.numero);
    }
  });

  it("resolves a known card with preview data in less than 300ms", async () => {
    const result = await getPasswordCatalog();
    if (!result.ok) throw result.error;
    const payload = toPasswordPayload(result.value);
    const hydrated = fromPasswordPayload(payload);
    if (payload.status !== "ok" || hydrated === undefined) throw new Error("catalog unavailable");
    const known = payload.cards[0];
    if (known?.password === null || known === undefined) throw new Error("known card unavailable");
    const started = performance.now();
    const resolution = resolvePasswordEntry({ rawInput: known.password.replaceAll(" ", ""), lookup: hydrated.lookup, balanceStars: known.estrelas ?? 0 });
    expect(performance.now() - started).toBeLessThan(300);
    expect(resolution).toMatchObject({ status: "resolved", card: { numero: known.numero, nome: known.nome, tipo: known.tipo, classe: known.classe } });
    expect(hydrated.artLookup(known.numero)).toBeDefined();
  });
});
