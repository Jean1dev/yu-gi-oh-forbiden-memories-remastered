import { LIBRARY_FILTER_TYPES, type LibraryFilterType } from "@yugioh/shared";

const LABELS: Readonly<Record<LibraryFilterType, string>> = {
  monstro: "Monstro",
  magica: "Mágica",
  armadilha: "Armadilha",
  equipamento: "Equipamento",
};

export type TypeFilterControlProps = Readonly<{
  value: readonly LibraryFilterType[];
  onChange: (value: readonly LibraryFilterType[]) => void;
}>;

export function TypeFilterControl({ value, onChange }: TypeFilterControlProps) {
  function toggle(type: LibraryFilterType): void {
    onChange(value.includes(type) ? value.filter((item) => item !== type) : [...value, type]);
  }

  return (
    <fieldset>
      <legend>Tipo {value.length === 0 ? "(Todos)" : ""}</legend>
      {LIBRARY_FILTER_TYPES.map((type) => (
        <label key={type}>
          <input
            type="checkbox"
            value={type}
            checked={value.includes(type)}
            onChange={() => toggle(type)}
          />
          {LABELS[type]}
        </label>
      ))}
    </fieldset>
  );
}
