export function SurrenderButton({
  available,
  onClick,
}: {
  readonly available: boolean;
  readonly onClick: () => void;
}) {
  if (!available) return null;
  return (
    <button type="button" onClick={onClick}>
      Render-se
    </button>
  );
}
