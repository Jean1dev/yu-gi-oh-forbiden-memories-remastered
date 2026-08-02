// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { Card } from "@yugioh/shared";
import { expect, it } from "vitest";
import { usePasswordLookup } from "./use-password-lookup.ts";

const card = { id: 1, numero: "001", nome: "Card", img: null, classe: "Dragon", atk: 1, def: 1, guardiao1: "Sun", guardiao2: "Moon", password: "89 63 11 39", estrelas: 5, tipo: "monstro" } as const satisfies Card;
it("submits, replaces, and clears resolutions", () => { const hook = renderHook(() => usePasswordLookup((password) => password === card.password ? card : undefined, 5)); act(() => { hook.result.current.setRawInput("89631139"); }); act(() => { hook.result.current.submit(); }); expect(hook.result.current.resolution?.status).toBe("resolved"); act(() => { hook.result.current.setRawInput("00000000"); }); act(() => { hook.result.current.submit(); }); expect(hook.result.current.resolution?.status).toBe("not_found"); act(() => { hook.result.current.setRawInput(""); }); expect(hook.result.current.resolution).toBeUndefined(); });
