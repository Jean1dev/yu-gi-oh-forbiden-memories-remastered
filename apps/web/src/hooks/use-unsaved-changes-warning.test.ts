// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUnsavedChangesWarning } from "./use-unsaved-changes-warning.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUnsavedChangesWarning", () => {
  it("registers the beforeunload listener when hasUnsavedChanges is true", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useUnsavedChangesWarning(true));

    expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("does not register the beforeunload listener when hasUnsavedChanges is false", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useUnsavedChangesWarning(false));

    expect(addSpy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("removes the listener once hasUnsavedChanges goes back to false", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { rerender } = renderHook(({ hasUnsavedChanges }) => useUnsavedChangesWarning(hasUnsavedChanges), {
      initialProps: { hasUnsavedChanges: true },
    });

    rerender({ hasUnsavedChanges: false });

    expect(removeSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("confirmInternalNavigation returns true without prompting when there is nothing unsaved", () => {
    const confirmSpy = vi.spyOn(window, "confirm");

    const { result } = renderHook(() => useUnsavedChangesWarning(false));

    expect(result.current.confirmInternalNavigation()).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("confirmInternalNavigation returns window.confirm's value and passes the PRD text", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() => useUnsavedChangesWarning(true));

    expect(result.current.confirmInternalNavigation()).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith("Você tem alterações não salvas. Sair sem salvar?");

    confirmSpy.mockReturnValue(false);
    expect(result.current.confirmInternalNavigation()).toBe(false);
  });
});
