// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutoAdvancePhase } from "./use-auto-advance-phase.ts";

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutoAdvancePhase", () => {
  it("dispatches advance_phase on its own after the delay during the draw phase", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    renderHook(() => useAutoAdvancePhase({ phase: "draw", active: true, dispatch, delayMs: 1000 }));

    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(999);
    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "advance_phase" });
  });

  it("dispatches advance_phase on its own after the delay during the end phase", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    renderHook(() => useAutoAdvancePhase({ phase: "end", active: true, dispatch, delayMs: 1000 }));

    vi.advanceTimersByTime(1000);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "advance_phase" });
  });

  it.each(["main", "battle"] as const)("never dispatches during the %s phase", (phase) => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    renderHook(() => useAutoAdvancePhase({ phase, active: true, dispatch, delayMs: 1000 }));

    vi.advanceTimersByTime(10_000);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch while inactive, even during draw/end", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    renderHook(() => useAutoAdvancePhase({ phase: "draw", active: false, dispatch, delayMs: 1000 }));

    vi.advanceTimersByTime(10_000);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("cancels the pending timer when it becomes inactive before the delay elapses", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useAutoAdvancePhase({ phase: "draw", active, dispatch, delayMs: 1000 }),
      { initialProps: { active: true } },
    );

    vi.advanceTimersByTime(500);
    rerender({ active: false });
    vi.advanceTimersByTime(1000);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("uses the default 1000ms delay when none is provided", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    renderHook(() => useAutoAdvancePhase({ phase: "end", active: true, dispatch }));

    vi.advanceTimersByTime(999);
    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "advance_phase" });
  });
});
