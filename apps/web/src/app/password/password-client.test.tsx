// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { Card } from "@yugioh/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { useWalletStore } from "../../stores/wallet-store.ts";
import type { PasswordCatalogPayload } from "../../lib/password/types.ts";
import { PasswordClient } from "./password-client.tsx";

const card = { id: 1, numero: "001", nome: "Blue-eyes", img: null, classe: "Dragon", atk: 3000, def: 2500, guardiao1: "Sun", guardiao2: "Moon", password: "89 63 11 39", estrelas: 10, tipo: "monstro" } as const satisfies Card;
const payload: PasswordCatalogPayload = { status: "ok", cards: [card], arts: { "001": { kind: "placeholder" } }, cropArts: {} };

describe("PasswordClient", () => {
  beforeEach(() => useWalletStore.setState({ state: { status: "ready", loaded: { origin: "server", stars: 10, effectiveStars: 10, pendingStars: 0, pendingDuelIds: [], syncedAt: "2026-07-31T00:00:00.000Z" } } }));
  it("does not mount search when the catalog is unavailable", () => { render(<PasswordClient catalogResult={{ status: "error" }} />); expect(screen.queryByLabelText("Digite a senha da carta")).toBeNull(); });
  it.each([["00000000", "Senha inválida. Verifique o código."], ["bad", "Senha inválida. Use apenas os números do código."]])("shows the matching rejection", (input, message) => { render(<PasswordClient catalogResult={payload} />); fireEvent.change(screen.getByLabelText("Digite a senha da carta"), { target: { value: input } }); fireEvent.click(screen.getByRole("button", { name: "Buscar" })); expect(screen.getByText(message)).toBeTruthy(); });
  it("signals a cached balance", () => { useWalletStore.setState({ state: { status: "ready", loaded: { origin: "cache", stars: 10, effectiveStars: 10, pendingStars: 0, pendingDuelIds: [], syncedAt: "2026-07-31T00:00:00.000Z" } } }); render(<PasswordClient catalogResult={payload} />); expect(screen.getByText("Saldo carregado do cache; sincronizando…")).toBeTruthy(); });
});
