// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { Card, PasswordResolution } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { CardPreview } from "./card-preview.tsx";

const card = { id: 1, numero: "001", nome: "Blue-eyes", img: null, classe: "Dragon", atk: 3000, def: 2500, guardiao1: "Sun", guardiao2: "Moon", password: "89 63 11 39", estrelas: 10, tipo: "monstro" } as const satisfies Card;
const resolution = (affordability: Extract<PasswordResolution, { status: "resolved" }>["affordability"]): Extract<PasswordResolution, { status: "resolved" }> => ({ status: "resolved", card, price: { stars: 10, source: "catalog" }, affordability });
describe("CardPreview", () => {
  it("shows card details, price, balance, and keeps release disabled", () => { render(<CardPreview resolution={resolution({ status: "affordable", balanceStars: 10 })} art={{ kind: "placeholder" }} />); expect(screen.getByText("Blue-eyes")).toBeTruthy(); expect(screen.getByText("Dragon")).toBeTruthy(); expect(screen.getByText("Custa 10⭐")).toBeTruthy(); expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true); });
  it("reports missing stars", () => { render(<CardPreview resolution={resolution({ status: "insufficient", balanceStars: 4, missingStars: 6 })} art={{ kind: "placeholder" }} />); expect(screen.getByText(/Faltam 6⭐/)).toBeTruthy(); });
  it("keeps unknown balance unavailable", () => { render(<CardPreview resolution={resolution({ status: "unknown" })} art={{ kind: "placeholder" }} />); expect(screen.getByText("Indisponível")).toBeTruthy(); expect(screen.queryByText("Saldo suficiente.")).toBeNull(); });
});
