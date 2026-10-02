/** Una tarea de un día ya pasado (o hecha hoy) con su resultado */
const LABELS = {
  done: i => `Hecha${i.doneAt ? ` a las ${i.doneAt}` : ''}`,
  missed: () => '😞 No la hiciste',
  moved: () => 'Pasada a otro día',
  excused: () => 'Día de comodín',
  pending: () => 'Pendiente'
};

export default function ResultRow({ item, onUndo }) {
  const { task, status, points } = item;
  return (
    <div className={`task result ${status}`}>
      <div className="ic" aria-hidden="true">{task.icon}</div>
      <div className="body">
        <div className="name">{task.name}</div>
        <div className="meta">{LABELS[status](item)}</div>
      </div>
      {points !== 0 && <span className={`pts${points < 0 ? ' neg' : ''}`}>{points > 0 ? `+${points}` : `−${-points}`}</span>}
      {onUndo && <button className="btn ghost sm" onClick={onUndo}>Deshacer</button>}
    </div>
  );
}
