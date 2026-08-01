"use client";

import { resolvePasswordEntry } from "@yugioh/rules";
import type { PasswordCardLookup, PasswordResolution } from "@yugioh/shared";
import { useCallback, useState } from "react";

export type PasswordLookupState = Readonly<{
  rawInput: string;
  resolution: PasswordResolution | undefined;
  setRawInput(value: string): void;
  submit(): void;
}>;

export function usePasswordLookup(
  lookup: PasswordCardLookup,
  balanceStars: number | undefined,
): PasswordLookupState {
  const [rawInput, setStoredInput] = useState("");
  const [resolution, setResolution] = useState<PasswordResolution>();

  const setRawInput = useCallback((value: string) => {
    setStoredInput(value);
    if (value.trim().length === 0) {
      setResolution(undefined);
    }
  }, []);

  const submit = useCallback(() => {
    if (rawInput.trim().length === 0) {
      setResolution(undefined);
      return;
    }
    setResolution(resolvePasswordEntry({ rawInput, lookup, balanceStars }));
  }, [balanceStars, lookup, rawInput]);

  return { rawInput, resolution, setRawInput, submit };
}
