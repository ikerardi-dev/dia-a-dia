import { CheckIcon } from './Icons.jsx';

/** Tarea sin fecha: se hace cuando puedas y suma al día en que la marques */
export default function AnytimeRow({ task, onDone, onEdit }) {
  return (
    <div className="task anytime">
      <div className="ic" aria-hidden="true">{task.icon}</div>
      <div className="body">
        <div className="name">{task.name}</div>
        <div className="meta"><b className="pts">+{task.points}</b> Sin fecha, {task.duration} min</div>
      </div>
      <button className="btn ghost sm" onClick={onEdit}>Editar</button>
      <button className="check" aria-label={`Marcar ${task.name} como hecha`} onClick={onDone}>
        <CheckIcon />
      </button>
    </div>
  );
}
