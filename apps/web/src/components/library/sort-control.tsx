import { LIBRARY_SORT_FIELDS, type LibrarySort, type LibrarySortField } from "@yugioh/shared";
import type { ChangeEvent } from "react";

const LABELS: Readonly<Record<LibrarySortField, string>> = {
  numero: "Número",
  nome: "Nome",
  atk: "ATK",
  def: "DEF",
  estrelas: "Estrelas",
};

export type SortControlProps = Readonly<{
  value: LibrarySort;
  onChange: (value: LibrarySort) => void;
}>;

export function SortControl({ value, onChange }: SortControlProps) {
  function changeField(event: ChangeEvent<HTMLSelectElement>): void {
    onChange({ ...value, field: event.currentTarget.value as LibrarySortField });
  }

  const nextDirection = value.direction === "asc" ? "desc" : "asc";
  const directionLabel =
    value.direction === "asc"
      ? "Ordem crescente; mudar para decrescente"
      : "Ordem decrescente; mudar para crescente";

  return (
    <div>
      <label htmlFor="library-sort">Ordenar por</label>
      <select id="library-sort" value={value.field} onChange={changeField}>
        {LIBRARY_SORT_FIELDS.map((field) => (
          <option key={field} value={field}>
            {LABELS[field]}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label={directionLabel}
        onClick={() => onChange({ ...value, direction: nextDirection })}
      >
        {value.direction === "asc" ? "↑" : "↓"}
      </button>
    </div>
  );
}
