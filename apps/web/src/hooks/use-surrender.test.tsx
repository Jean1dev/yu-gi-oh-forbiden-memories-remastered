// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { ApplyResult, DuelSession, DuelState } from "@yugioh/shared";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSurrender } from "./use-surrender.ts";

const active = {
  status: "in_progress",
  duelSessionId: "duel-1",
  duelistId: "seto",
  state: { phase: "main" },
  currentDecider: "P2",
} as DuelSession;

function Harness({
  initialSession = active,
  apply = vi.fn(() => ({ state: { phase: "end" } as DuelState, events: [] }) as ApplyResult),
}: {
  readonly initialSession?: DuelSession;
  readonly apply?: (state: DuelState, action: unknown) => ApplyResult;
}) {
  const [session, setSession] = useState(initialSession);
  const flow = useSurrender({ session, playerId: "P1", apply, onSessionChange: setSession });
  return (
    <>
      <span data-testid="status">{session.status}</span>
      <span data-testid="open">{String(flow.confirmationOpen)}</span>
      <button type="button" onClick={flow.requestConfirmation}>request</button>
      <button type="button" onClick={flow.confirm}>confirm</button>
      <button type="button" onClick={flow.cancel}>cancel</button>
      <button type="button" onClick={() => setSession({ status: "not_started" })}>finish</button>
      <a href="/free-duel">leave</a>
    </>
  );
}

describe("useSurrender", () => {
  it("opens the same confirmation from the explicit action and an exit attempt", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "request" }));
    expect(screen.getByTestId("open").textContent).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(screen.getByTestId("open").textContent).toBe("false");
    const exit = fireEvent.click(screen.getByRole("link", { name: "leave" }));
    expect(exit).toBe(false);
    expect(screen.getByTestId("open").textContent).toBe("true");
  });

  it("re-reads the latest session when confirmation happens", () => {
    const apply = vi.fn();
    render(<Harness apply={apply} />);
    fireEvent.click(screen.getByRole("button", { name: "request" }));
    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    fireEvent.click(screen.getByRole("button", { name: "confirm" }));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByTestId("status").textContent).toBe("not_started");
  });
});
