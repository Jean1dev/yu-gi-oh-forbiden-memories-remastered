export function ExpensiveRedemptionDialog({open,priceStars,onConfirm,onCancel}:{open:boolean;priceStars:number;onConfirm():void;onCancel():void}) {
  if(!open)return null; return <div role="dialog" aria-modal="true" aria-label="Confirmar liberação cara"><p>Esta liberação custa {priceStars.toLocaleString("pt-BR")}⭐. Confirmar?</p><button onClick={onConfirm}>Confirmar</button><button onClick={onCancel}>Cancelar</button></div>;
}
