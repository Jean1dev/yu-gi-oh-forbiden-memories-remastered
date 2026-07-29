import type { DuelSession } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { interceptDuelExit } from "./duel-exit-guard.ts";

describe("interceptDuelExit", () => {
  it("blocks an exit and requests confirmation during an active duel", () => {
    const openConfirmation = vi.fn();
    const session = { status: "in_progress" } as DuelSession;

    expect(interceptDuelExit(session, openConfirmation)).toBe("blocked");
    expect(openConfirmation).toHaveBeenCalledOnce();
  });

  it.each([
    { status: "not_started" },
    { status: "ended" },
    { status: "failed" },
  ] as const)("allows an exit without confirmation when the session is $status", (session) => {
    const openConfirmation = vi.fn();

    expect(interceptDuelExit(session as DuelSession, openConfirmation)).toBe("allowed");
    expect(openConfirmation).not.toHaveBeenCalled();
  });
});
