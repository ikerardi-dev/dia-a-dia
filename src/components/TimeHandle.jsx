import { useEffect, useRef, useState } from 'react';
import { fromMin } from '../lib/format.js';

const HOLD_MS = 250;     // tiempo pulsado antes de empezar a arrastrar
const STEP_PX = 16;      // píxeles de desplazamiento por cada paso
const STEP_MIN = 10;     // minutos por paso
const CANCEL_PX = 8;     // si se mueve antes de tiempo, no es un arrastre
const MAX_START = 23 * 60 + 50;

/**
 * Hora de una tarea que se puede cambiar: mantén pulsado y desliza.
 * Hacia abajo avanza y hacia arriba retrocede, de 10 en 10 minutos.
 * Al soltar llama a onCommit con la nueva hora (en minutos).
 */
export default function TimeHandle({ start, isNow, isLate = false, onCommit }) {
  const [preview, setPreview] = useState(null);
  const gesture = useRef(null);

  useEffect(() => () => clearTimeout(gesture.current?.timer), []);

  const clamp = v => Math.min(MAX_START, Math.max(0, v));

  const onPointerDown = e => {
    if (e.button !== undefined && e.button !== 0) return;
    const el = e.currentTarget;
    const { pointerId, clientY } = e;
    const timer = setTimeout(() => {
      if (!gesture.current) return;
      gesture.current.active = true;
      try { el.setPointerCapture(pointerId); } catch { /* sin captura */ }
      navigator.vibrate?.(15);
      setPreview(start);
    }, HOLD_MS);
    gesture.current = { startY: clientY, timer, active: false, value: start };
  };

  const onPointerMove = e => {
    const g = gesture.current;
    if (!g) return;
    if (!g.active) {
      if (Math.abs(e.clientY - g.startY) > CANCEL_PX) {
        clearTimeout(g.timer);
        gesture.current = null;
      }
      return;
    }
    e.preventDefault();
    const steps = Math.round((e.clientY - g.startY) / STEP_PX);
    const value = clamp(start + steps * STEP_MIN);
    if (value !== g.value) {
      g.value = value;
      setPreview(value);
    }
  };

  const finish = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    clearTimeout(g.timer);
    if (!g.active) return;
    setPreview(null);
    if (g.value !== start) onCommit(g.value);
  };

  // Con teclado: flechas arriba y abajo
  const onKeyDown = e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    onCommit(clamp(start + (e.key === 'ArrowDown' ? STEP_MIN : -STEP_MIN)));
  };

  const dragging = preview !== null;
  const delta = dragging ? preview - start : 0;

  return (
    <button
      type="button"
      className={`time handle${dragging ? ' dragging' : ''}${isNow && !dragging ? ' now' : ''}${isLate && !dragging ? ' late' : ''}`}
      aria-label={`Hora ${fromMin(start)}. Mantén pulsado y desliza para cambiarla`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onContextMenu={e => e.preventDefault()}
      onKeyDown={onKeyDown}
    >
      {dragging ? fromMin(preview) : isNow ? 'Ahora' : fromMin(start)}
      {dragging && delta !== 0 && <small>{delta > 0 ? `+${delta}` : delta} min</small>}
    </button>
  );
}
