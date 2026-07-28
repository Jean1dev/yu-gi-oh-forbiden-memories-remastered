// @vitest-environment jsdom
import { DomainError } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BlockMessage } from "./block-message.tsx";

describe("BlockMessage", () => {
  it("renders nothing when there is no block", () => {
    const { container } = render(<BlockMessage lastBlock={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for the defensive card_not_in_draft code", () => {
    const error = new DomainError("boom", "card_not_in_draft", { cardNumber: "001" });
    const { container } = render(<BlockMessage lastBlock={error} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the static message for card_not_owned", () => {
    const error = new DomainError("boom", "card_not_owned", { cardNumber: "001" });
    render(<BlockMessage lastBlock={error} />);
    expect(screen.getByText("Carta não está na sua coleção.")).toBeTruthy();
  });

  it("shows the static message for max_copies_limit", () => {
    const error = new DomainError("boom", "max_copies_limit", { cardNumber: "001", quantityInDraft: 3 });
    render(<BlockMessage lastBlock={error} />);
    expect(screen.getByText("Máximo de 3 cópias por carta.")).toBeTruthy();
  });

  it("shows the dynamic message with the owned quantity for owned_quantity_limit", () => {
    const error = new DomainError("boom", "owned_quantity_limit", { cardNumber: "001", quantityOwned: 2 });
    render(<BlockMessage lastBlock={error} />);
    expect(screen.getByText("Você possui apenas 2 cópia(s) desta carta.")).toBeTruthy();
  });
});
