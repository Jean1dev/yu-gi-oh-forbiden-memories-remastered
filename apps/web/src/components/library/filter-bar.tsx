import type { LibraryFilters } from "@yugioh/shared";

import { ClearFiltersButton } from "./clear-filters-button.tsx";
import styles from "./filter-bar.module.css";
import { SortControl } from "./sort-control.tsx";
import { StatusFilterControl } from "./status-filter-control.tsx";
import { TypeFilterControl } from "./type-filter-control.tsx";

export type FilterBarProps = Readonly<{
  filters: LibraryFilters;
  hasNonDefaultFilters: boolean;
  onChange: (filters: LibraryFilters) => void;
  onClear: () => void;
}>;

export function FilterBar({ filters, hasNonDefaultFilters, onChange, onClear }: FilterBarProps) {
  return (
    <details className={styles.filters}>
      <summary>Filtros</summary>
      <div className={styles.panel}>
        <StatusFilterControl
          value={filters.status}
          onChange={(status) => onChange({ ...filters, status })}
        />
        <TypeFilterControl
          value={filters.types}
          onChange={(types) => onChange({ ...filters, types })}
        />
        <SortControl value={filters.sort} onChange={(sort) => onChange({ ...filters, sort })} />
        <ClearFiltersButton disabled={!hasNonDefaultFilters} onClear={onClear} />
      </div>
    </details>
  );
}
