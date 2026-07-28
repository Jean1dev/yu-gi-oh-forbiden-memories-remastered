"use client";

export type CollectionSearchFieldProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
}>;

/** Controlled text field that dispatches the search on every keystroke, no debounce (spec build-deck/F04, Decision 4). */
export function CollectionSearchField({ value, onChange }: CollectionSearchFieldProps) {
  return (
    <input
      type="search"
      aria-label="Buscar carta pelo nome"
      placeholder="Buscar carta pelo nome"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
