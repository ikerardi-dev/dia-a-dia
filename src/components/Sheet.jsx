import { useEffect, useRef } from 'react';
import { useBackHandler } from '../hooks/useBackHandler.js';

/** Hoja modal basada en <dialog>. Se cierra con Escape o tocando fuera. */
export default function Sheet({ title, onClose, children }) {
  const ref = useRef(null);
  useBackHandler(true, onClose);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    const onCancel = e => { e.preventDefault(); onClose(); };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [onClose]);

  return (
    <dialog ref={ref} className="sheet-dialog" onClick={e => { if (e.target === ref.current) onClose(); }}>
      <div className="sheet">
        <h3>{title}</h3>
        {children}
      </div>
    </dialog>
  );
}
