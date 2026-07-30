"use client";

import type { ChangeEvent } from "react";

export type LibrarySearchFieldProps = Readonly<{
  term: string;
  onChange: (term: string) => void;
  onClear: () => void;
}>;

export function LibrarySearchField({ term, onChange, onClear }: LibrarySearchFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onChange(event.currentTarget.value);
  }

  return (
    <search aria-label="Buscar na coleção">
      <label htmlFor="library-search">Buscar carta</label>
      <input
        id="library-search"
        type="search"
        value={term}
        maxLength={80}
        autoComplete="off"
        placeholder="Nome ou número"
        onChange={handleChange}
      />
      <button
        type="button"
        aria-label="Limpar busca"
        disabled={term.length === 0}
        onClick={onClear}
      >
        ×
      </button>
    </search>
  );
}
