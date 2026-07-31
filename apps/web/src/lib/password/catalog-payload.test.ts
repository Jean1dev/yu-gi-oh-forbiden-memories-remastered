import type { Card, ObtainedArtReference } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { fromPasswordPayload, toPasswordPayload } from "./catalog-payload.ts";
import type { PasswordCatalog, PasswordCatalogLookup } from "./types.ts";

const card = (numero: string, password: string | null): Card => ({ id: Number(numero), numero, nome: `Card ${numero}`, img: null, classe: "Dragon", atk: 1, def: 1, guardiao1: "Sun", guardiao2: "Moon", password, estrelas: 5, tipo: "monstro" });
const catalog: PasswordCatalog = { cards: [card("001", "00 00 00 01"), card("002", null)], artLookup: (number) => number === "001" ? { kind: "art", path: "/001.jpg" } : { kind: "placeholder" } };

describe("password catalog payload", () => {
  it("includes only password cards and preserves art", () => { const payload = toPasswordPayload(catalog); expect(payload).toMatchObject({ status: "ok", cards: [{ numero: "001" }], arts: { "001": { kind: "art" } } }); });
  it("returns undefined for an error payload", () => expect(fromPasswordPayload({ status: "error" })).toBeUndefined());
  it("round-trips lookup and falls back for missing art", () => { const hydrated = fromPasswordPayload({ status: "ok", cards: [card("001", "00 00 00 01")], arts: {} }) as PasswordCatalogLookup; expect(hydrated.lookup("00 00 00 01")?.numero).toBe("001"); expect(hydrated.artLookup("001")).toEqual({ kind: "placeholder" }); });
  it("does not treat inherited art keys as entries", () => { const arts = Object.create({ "001": { kind: "art", path: "bad" } }) as Record<string, ObtainedArtReference>; const hydrated = fromPasswordPayload({ status: "ok", cards: [card("001", "00 00 00 01")], arts }); expect(hydrated?.artLookup("001")).toEqual({ kind: "placeholder" }); });
});
