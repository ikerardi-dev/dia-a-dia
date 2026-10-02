import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { longDate } from '../lib/format.js';
import DayTimeline from './DayTimeline.jsx';
import TaskRow from './TaskRow.jsx';
import ResultRow from './ResultRow.jsx';

/** Detalle de un día en solo lectura (calendario y méritos) */
export default function DayDetail({ date, version, open }) {
  const { data: day } = useQuery(() => api.day(date), [date, version]);
  if (!day || day.date !== date) return <p className="loading">Cargando…</p>;

  const header = (
    <div className="spread detail-head">
      <h3>{longDate(date)}</h3>
      {!day.isPast && open && <button className="btn sm" onClick={() => open.busy(null, date)}>＋ Ocupado este día</button>}
    </div>
  );

  if (day.wildcard) {
    return <>{header}<p className="wild-note">🃏 Día de comodín: las tareas no contaron.</p></>;
  }

  if (day.isPast) {
    const shown = day.all.filter(i => i.status !== 'moved');
    return (
      <>
        {header}
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
