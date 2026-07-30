import { COLLECTION_STATUS_FILTERS, type CollectionStatusFilter } from "@yugioh/shared";

const LABELS: Readonly<Record<CollectionStatusFilter, string>> = {
  obtidas: "Obtidas",
  "nao-obtidas": "Não obtidas",
  todas: "Todas",
};

export type StatusFilterControlProps = Readonly<{
  value: CollectionStatusFilter;
  onChange: (value: CollectionStatusFilter) => void;
}>;

export function StatusFilterControl({ value, onChange }: StatusFilterControlProps) {
  return (
    <fieldset>
      <legend>Status</legend>
      {COLLECTION_STATUS_FILTERS.map((status) => (
        <label key={status}>
          <input
            type="radio"
            name="library-status"
            value={status}
            checked={value === status}
            onChange={() => onChange(status)}
          />
          {LABELS[status]}
        </label>
      ))}
    </fieldset>
  );
}
