import { describe, expect, it } from "vitest";

import { validateDropTableSchema } from "./validate-drop-table-schema.ts";

describe("validateDropTableSchema", () => {
  it("aceita array vazio como tabela sem pools", () => {
    const result = validateDropTableSchema([]);

    expect(result).toEqual({ ok: true, value: [] });
  });

  it("aceita pool com uma entrada valida e probabilidade positiva", () => {
    const result = validateDropTableSchema([
      { duelista: "duelista-01", entradas: [{ numero: "001", probabilidade: 1 }] },
    ]);

    expect(result.ok).toBe(true);
  });

  it("aceita entrada com condicao ausente", () => {
    const result = validateDropTableSchema([
      { duelista: "duelista-01", entradas: [{ numero: "001", probabilidade: 1 }] },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.entradas[0]?.condicao).toBeUndefined();
    }
  });

  it("aceita entrada com condicao textual presente", () => {
    const result = validateDropTableSchema([
      {
        duelista: "duelista-01",
        entradas: [{ numero: "001", probabilidade: 1, condicao: "vitoria_modo_dificil" }],
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.entradas[0]?.condicao).toBe("vitoria_modo_dificil");
    }
  });

  it("rejeita probabilidade zero", () => {
    const result = validateDropTableSchema([
      { duelista: "duelista-01", entradas: [{ numero: "001", probabilidade: 0 }] },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("schema_tabela_drops_invalido");
    }
  });

  it("rejeita probabilidade negativa", () => {
    const result = validateDropTableSchema([
      { duelista: "duelista-01", entradas: [{ numero: "001", probabilidade: -1 }] },
    ]);

    expect(result.ok).toBe(false);
  });

  it("rejeita numero fora do formato de tres digitos", () => {
    const result = validateDropTableSchema([
      { duelista: "duelista-01", entradas: [{ numero: "1", probabilidade: 1 }] },
    ]);

    expect(result.ok).toBe(false);
  });

  it("rejeita pool com entradas vazio", () => {
    const result = validateDropTableSchema([{ duelista: "duelista-01", entradas: [] }]);

    expect(result.ok).toBe(false);
  });

  it("rejeita duelista vazio", () => {
    const result = validateDropTableSchema([
      { duelista: "", entradas: [{ numero: "001", probabilidade: 1 }] },
    ]);

    expect(result.ok).toBe(false);
  });
});
