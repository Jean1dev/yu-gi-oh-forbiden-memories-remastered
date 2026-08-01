export function RedeemAction({ priceStars, disabled, submitting, onRedeem }: { priceStars:number; disabled:boolean; submitting:boolean; onRedeem():void }) {
  return <button type="button" disabled={disabled||submitting} onClick={onRedeem}>{submitting?"Liberando…":`Liberar (custa ${priceStars.toLocaleString("pt-BR")}⭐)`}</button>;
}
