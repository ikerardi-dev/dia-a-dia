import { useEffect, useRef } from 'react';
import { CheckIcon } from './Icons.jsx';
import { PREF_LABEL } from '../lib/catalog.js';
import { shortDate } from '../lib/format.js';

/**
 * Una tarea pendiente. Si recibe `actions`, muestra el botón de hecho y el menú.
 * actions = { menuOpen, onToggleMenu, onDone, onLater, onTomorrow, onEdit }
 */
export default function TaskRow({ item, actions }) {
  const { task } = item;
  const wrap = useRef(null);
  const menuOpen = actions?.menuOpen;

  // Cerrar el menú al tocar fuera
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = e => { if (!wrap.current?.contains(e.target)) actions.onToggleMenu(); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menuOpen, actions]);

  const meta = item.carried
    ? `😞 Aplazada del ${shortDate(item.fromDate)}`
    : item.autoMoved
      ? `📦 Repartida del ${shortDate(item.fromDate)}, ${task.duration} min`
      : `${task.time ? `A las ${task.time}` : PREF_LABEL[task.pref]}, ${task.duration} min`;

  return (
    <div className={`task${item.carried ? ' carried' : ''}`}>
      <div className="ic" aria-hidden="true">{task.icon}</div>
      <div className="body">
        <div className="name">{task.name}</div>
        <div className="meta"><b className="pts">+{task.points}</b> {meta}</div>
      </div>

      {actions && (
        <>
          <div className="menu-wrap" ref={wrap}>
            <button className="icon-btn" aria-label="Más opciones" aria-expanded={menuOpen} onClick={actions.onToggleMenu}>⋯</button>
            {menuOpen && (
              <div className="menu" role="menu">
                <button role="menuitem" onClick={actions.onLater}>Más tarde (dentro de 1 h)</button>
                <button role="menuitem" onClick={actions.onTomorrow} disabled={!item.canMoveTomorrow}>
                  Pasar a mañana
                  {!item.canMoveTomorrow && <small>{item.carried >= 2 ? 'Ya la aplazaste dos veces' : 'Mañana ya te toca'}</small>}
                </button>
                <button role="menuitem" onClick={actions.onEdit}>Editar tarea</button>
              </div>
            )}
          </div>
          <button className="check" aria-label={`Marcar ${task.name} como hecha`} onClick={actions.onDone}>
            <CheckIcon />
          </button>
        </>
      )}
    </div>
  );
}
