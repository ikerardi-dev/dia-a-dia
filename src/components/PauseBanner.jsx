import { shortDate } from '../lib/format.js';

/** Aviso en Hoy cuando hay una pausa en curso */
export default function PauseBanner({ pause, onEdit }) {
  return (
    <div className="pause-banner">
      <span className="pause-icon" aria-hidden="true">🏖️</span>
      <div className="pause-body">
        <b>{pause.label} hasta el {shortDate(pause.to)}</b>
        <p>{pause.taskIds.length} {pause.taskIds.length === 1 ? 'tarea en pausa' : 'tareas en pausa'}. Lo que esté en pausa no resta ni rompe la racha.</p>
      </div>
      <button className="btn ghost sm" onClick={onEdit}>Editar</button>
    </div>
  );
}
