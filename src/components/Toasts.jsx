import { useEffect, useRef } from 'react';

/**
 * Avisos flotantes. Las ventanas (<dialog>) se dibujan en la "capa superior"
 * del navegador y taparían los avisos; por eso los avisos también se muestran
 * en esa capa (popover) y se vuelven a abrir cada vez para quedar encima.
 */
export default function Toasts({ toasts }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el?.showPopover) return;
    try {
      if (el.matches(':popover-open')) el.hidePopover();
      if (toasts.length) el.showPopover();
    } catch { /* sin soporte: se ven como antes */ }
  }, [toasts]);

  return (
    <div ref={ref} className="toasts" popover="manual" aria-live="polite">
      {toasts.map(t => <div key={t.id} className="toast">{t.message}</div>)}
    </div>
  );
}
