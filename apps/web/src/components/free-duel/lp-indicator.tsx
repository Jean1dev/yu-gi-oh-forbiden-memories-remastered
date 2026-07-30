export function LpIndicator({ label, lp }: { readonly label: string; readonly lp: number }) {
  return (
    <p aria-label={`${label} life points`}>
      {label}: <strong>{lp} LP</strong>
    </p>
  );
}
