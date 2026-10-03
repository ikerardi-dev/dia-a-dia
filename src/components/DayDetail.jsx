import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { longDate } from '../lib/format.js';
import DayTimeline from './DayTimeline.jsx';
import TaskRow from './TaskRow.jsx';
import ResultRow from './ResultRow.jsx';
import { formatScore, scoreStyle } from '../lib/rating.js';

/** Detalle de un día en solo lectura (calendario y méritos) */
export default function DayDetail({ date, version, open }) {
  const { data: day } = useQuery(() => api.day(date), [date, version]);
  if (!day || day.date !== date) return <p className="loading">Cargando…</p>;

  const canRate = open && (day.isPast || day.isToday);
  const header = (
    <>
      <div className="spread detail-head">
        <h3>{longDate(date)}</h3>
        {!day.isPast && open && <button className="btn sm" onClick={() => open.busy(null, date)}>＋ Evento</button>}
      </div>
      {canRate && (
        <div className="day-rating">
          {day.rating !== null
            ? <span className="score-chip" style={scoreStyle(day.rating)}>{formatScore(day.rating)}</span>
            : <span className="sub">Sin nota</span>}
          <button className="btn ghost sm" onClick={() => open.rating(date, day.rating, day.isToday)}>
            {day.rating !== null ? 'Cambiar nota' : 'Poner nota'}
          </button>
        </div>
      )}
    </>
  );

  const pauseNote = day.pause && <p className="pause-note">🏖️ {day.pause.label}: {day.pause.taskIds.length} {day.pause.taskIds.length === 1 ? 'tarea en pausa' : 'tareas en pausa'}.</p>;

  if (day.wildcard) {
    return <>{header}<p className="wild-note">🃏 Día de comodín: las tareas no contaron.</p></>;
  }

  if (day.isPast) {
    const shown = day.all.filter(i => i.status !== 'moved');
    return (
      <>
        {header}
        {pauseNote}
        {shown.length
          ? <div className="tlist">{shown.map(i => <ResultRow key={i.id} item={i} />)}</div>
          : <p className="sub">Ese día no había retos.</p>}
      </>
    );
  }

  const { schedule } = day;
  const empty = !schedule.slots.length && !schedule.unplaced.length && !schedule.busy.length;

  return (
    <>
      {header}
      {pauseNote}
      <DayTimeline
        schedule={schedule}
        isToday={day.isToday}
        renderTask={slot => <TaskRow item={slot} />}
        onEditBusy={open ? b => open.busy(b) : undefined}
      />
      {schedule.unplaced.length > 0 && (
        <div className="tlist unplaced">
          {schedule.unplaced.map(i => (
            <div className="slot" key={i.id}><div className="time">—</div><TaskRow item={i} /></div>
          ))}
        </div>
      )}
      {day.done.length > 0 && <p className="sub">Ya hechas: {day.done.map(i => i.task.name).join(', ')}</p>}
      {empty && <p className="sub">{day.done.length ? 'Todo hecho.' : 'Día libre de retos.'}</p>}
    </>
  );
}
