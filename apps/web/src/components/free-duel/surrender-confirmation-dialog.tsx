import { SURRENDER_CONFIRMATION_MESSAGE } from "../../lib/free-duel/surrender-messages.ts";

export function SurrenderConfirmationDialog({
  open,
  onConfirm,
  onCancel,
}: {
  readonly open: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="surrender-confirmation-title">
      <h2 id="surrender-confirmation-title">Confirmar rendição</h2>
      <p>{SURRENDER_CONFIRMATION_MESSAGE}</p>
      <button type="button" onClick={onConfirm}>
        Confirmar
      </button>
      <button type="button" onClick={onCancel} autoFocus>
        Cancelar
      </button>
    </div>
  );
}
