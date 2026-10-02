import { useState } from 'react';
import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { joinNatural } from '../lib/format.js';
import DayTimeline from '../components/DayTimeline.jsx';
import TaskRow from '../components/TaskRow.jsx';
import ResultRow from '../components/ResultRow.jsx';
import NoticeCard from '../components/NoticeCard.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function TodayView({ version, minute, act, open }) {
  const [menu, setMenu] = useState(null);
  const { data } = useQuery(
    () => Promise.all([api.today(), api.notice(), api.wildcard(), api.tasks()]),
    [version, minute]
  );
  if (!data) return <p className="loading">Cargando…</p>;
  const [day, notice, wildcard, tasks] = data;

  if (!tasks.length) {
    return (
      <EmptyState
        icon="🗓️"
        title="Crea tus retos del día a día y yo te los reparto en el calendario."
        text="Cada tarea hecha suma puntos. La que se queda sin hacer resta y se mueve a otro día."
      >
        <button className="btn primary" onClick={() => open.task(null)}>Crear mi primera tarea</button>
        <button className="btn" onClick={() => act(api.loadExampleTasks, 'Tareas de ejemplo cargadas. Puedes editarlas en Tareas.')}>Cargar tareas de ejemplo</button>
      </EmptyState>
    );
  }

  const { schedule } = day;
  const pending = [...schedule.slots, ...schedule.unplaced];
  const counted = day.done.length + pending.length;
  const pct = counted ? Math.round((day.done.length / counted) * 100) : 0;

  let lead;
  if (day.wildcard) lead = 'Hoy es tu día de comodín. Descansa, mañana seguimos.';
  else if (pending.length) {
    const names = pending.map(i => i.task.name.toLowerCase());
    lead = names.length > 3
      ? `Hoy te toca ${names.slice(0, 2).join(', ')} y ${names.length - 2} tareas más.`
      : `Hoy te toca ${joinNatural(names)}.`;
  }
  else if (day.done.length) lead = 'Todo hecho por hoy. Así se hace.';
  else lead = 'Hoy no tienes retos programados.';

  const rowActions = item => ({
    menuOpen: menu === item.id,
    onToggleMenu: () => setMenu(m => (m === item.id ? null : item.id)),
    onDone: () => {
      setMenu(null);
      act(() => api.completeTask(item.id), r => `Bien hecho: +${r.points} puntos.`);
    },
    onLater: () => {
      setMenu(null);
      act(() => api.postponeLater(item.id), r => `Movida a partir de las ${r.notBefore}.`);
    },
    onTomorrow: () => {
      setMenu(null);
      act(() => api.moveToTomorrow(item.id), 'Pasada a mañana. No te libras dos veces 😉');
    },
    onEdit: () => {
      setMenu(null);
      open.task(item.task);
    }
  });

  const askWildcard = () => open.confirm({
    title: '¿Usar el comodín hoy?',
    text: 'Las tareas de hoy no restarán puntos y tu racha no se rompe. Las que ya hayas hecho siguen contando.',
    confirmLabel: 'Usar comodín',
    onConfirm: () => act(api.useWildcard, 'Comodín activado. Hoy no cuenta.')
  });

  return (
    <div className="stack">
      {notice && <NoticeCard notice={notice} onDismiss={() => act(api.dismissNotice)} />}

      <section className={`card stack${day.wildcard ? ' wild' : ''}`}>
        <p className="lead">{lead}</p>
        {!day.wildcard && (
          <>
            <div className="spread">
              <span className="sub">{day.done.length} de {counted} hechas, +{day.earned} puntos hoy</span>
              <span className="sub">{pct}%</span>
            </div>
            <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
        <div className="row wrap">
          <button className="btn" onClick={() => open.busy(null, day.date)}>＋ Tengo clase o trabajo</button>
          {day.wildcard ? (
            <button className="btn ghost" onClick={() => act(api.cancelWildcard, 'Comodín cancelado. Las tareas vuelven a contar.')}>Cancelar comodín</button>
          ) : wildcard.perWeek > 0 && (
            <button className="btn ghost" onClick={askWildcard} disabled={!wildcard.available}>
              🃏 {wildcard.available ? `Usar comodín (${wildcard.available})` : 'Comodín gastado esta semana'}
            </button>
          )}
        </div>
      </section>

      {!day.wildcard && (
        <>
          {(schedule.slots.length > 0 || schedule.busy.length > 0) && <h2 className="sec">Tu día</h2>}
          <DayTimeline
            schedule={schedule}
            isToday
            renderTask={slot => <TaskRow item={slot} actions={rowActions(slot)} />}
            onEditBusy={b => open.busy(b)}
          />

          {schedule.unplaced.length > 0 && (
            <>
              <h2 className="sec">Sin hueco hoy</h2>
              <p className="sub tight">Si no las haces antes de medianoche, restan puntos.</p>
              <div className="tlist">
                {schedule.unplaced.map(item => (
                  <div className="slot" key={item.id}>
                    <div className="time">—</div>
                    <TaskRow item={item} actions={rowActions(item)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {day.done.length > 0 && (
        <>
          <h2 className="sec">Hecho hoy</h2>
          <div className="tlist">
            {day.done.map(item => (
              <ResultRow key={item.id} item={item} onUndo={() => act(() => api.undoTask(item.id))} />
            ))}
          </div>
        </>
      )}

      {day.wildcard && day.excused.length > 0 && (
        <p className="sub">No cuentan hoy: {day.excused.map(i => i.task.name).join(', ')}</p>
      )}
      {day.moved.length > 0 && (
        <p className="sub">Pasadas a mañana: {day.moved.map(i => i.task.name).join(', ')}</p>
      )}
      {day.all.some(i => i.carried && i.status === 'pending') && (
        <p className="sub">Las marcadas con 😞 vienen de días anteriores. Si se vuelven a quedar sin hacer, restan otra vez.</p>
      )}
    </div>
  );
}

