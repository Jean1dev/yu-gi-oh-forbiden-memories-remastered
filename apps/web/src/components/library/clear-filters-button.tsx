export type ClearFiltersButtonProps = Readonly<{
  disabled: boolean;
  onClear: () => void;
}>;

export function ClearFiltersButton({ disabled, onClear }: ClearFiltersButtonProps) {
  return (
    <button type="button" disabled={disabled} onClick={onClear}>
      Limpar filtros
    </button>
  );
}
