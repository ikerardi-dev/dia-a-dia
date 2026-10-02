import { useState } from 'react';
import Sheet from './Sheet.jsx';

export default function ConfirmSheet({ title, text, confirmLabel, danger = false, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    await onConfirm();
    onClose();
  };

  return (
    <Sheet title={title} onClose={onClose}>
      {text && <p className="sub">{text}</p>}
      <div className="actions">
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
        <button type="button" className={`btn ${danger ? 'danger-fill' : 'primary'}`} disabled={busy} onClick={confirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
