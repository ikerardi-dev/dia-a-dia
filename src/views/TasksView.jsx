import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { PREF_LABEL, REPEATING } from '../lib/catalog.js';
import { WEEK, DOW_SHORT, longDate, todayStr } from '../lib/format.js';
import SettingsPanel from '../forms/SettingsPanel.jsx';

/** Texto bajo el nombre según el tipo de tarea */
function taskMeta(t, today) {
  const when = t.time ? `a las ${t.time}` : PREF_LABEL[t.pref].toLowerCase();
  if (t.freq.type === 'anytime') return `Sin fecha, ${t.duration} min`;
  if (t.freq.type === 'once') return `${longDate(t.startDate)}, ${when}${t.syncCalendar ? ' 📲' : ''}`;
  const start = t.startDate > today ? `, empieza el ${longDate(t.startDate)}` : '';
  return `${t.freqLabel}, ${when}, ${t.duration} min${start}`;
}

function TaskGroup({ title, tasks, today, onEdit }) {
  if (!tasks.length) return null;
  return (
    <>
      <h2 className="sec">{title}</h2>
      <div className="tlist">
        {tasks.map(t => (
          <div key={t.id} className="task">
            <div className="ic" aria-hidden="true">{t.icon}</div>
            <div className="body">
              <div className="name">{t.name}</div>
              <div className="meta">{taskMeta(t, today)}</div>
            </div>
            <div className="pts">+{t.points}</div>
            <button className="btn ghost sm" onClick={() => onEdit(t)}>Editar</button>
          </div>
        ))}
      </div>
    </>
  );
}

function BusyList({ blocks, onEdit, describe }) {
  return (
    <div className="tlist">
      {blocks.map(b => (
        <div key={b.id} className={`task busy${b.date ? ' event' : ''}`}>
          <div className="ic" aria-hidden="true">{b.icon}</div>
          <div className="body">
            <div className="name">{b.label}</div>
            <div className="meta">{describe(b)}</div>
          </div>
          <button className="btn ghost sm" onClick={() => onEdit(b)}>Editar</button>
        </div>
      ))}
    </div>
  );
}

export default function TasksView({ version, act, open, toast }) {
  const { data } = useQuery(() => Promise.all([api.tasks(), api.busy(), api.settings()]), [version]);
  if (!data) return <p className="loading">Cargando…</p>;
  const [tasks, busy, settings] = data;
  const today = todayStr();

  const repeating = tasks.filter(t => REPEATING.includes(t.freq.type));
  const once = tasks.filter(t => t.freq.type === 'once').sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const anytime = tasks.filter(t => t.freq.type === 'anytime');
  const weekly = busy.filter(b => !b.date);
  const events = busy.filter(b => b.date && b.date >= today);

  return (
    <div className="stack">
      <div className="spread">
        <h2 className="title">Tus tareas</h2>
        <button className="btn primary" onClick={() => open.task(null)}>＋ Nueva tarea</button>
      </div>

      {!tasks.length && (
        <div className="card empty-state">
          <p className="sub">Aún no tienes tareas.</p>
          <button className="btn" onClick={() => act(api.loadExampleTasks, 'Tareas de ejemplo cargadas.')}>Cargar tareas de ejemplo</button>
        </div>
      )}

      <div>
        <TaskGroup title="Se repiten" tasks={repeating} today={today} onEdit={open.task} />
        <TaskGroup title="Una vez" tasks={once} today={today} onEdit={open.task} />
        <TaskGroup title="Sin fecha" tasks={anytime} today={today} onEdit={open.task} />
      </div>

      <div className="spread section-gap">
        <div>
          <h2 className="title">Próximos eventos</h2>
          <p className="sub tight">Pádel, citas, cumpleaños... Las tareas se colocan alrededor.</p>
        </div>
        <button className="btn" onClick={() => open.busy(null, today)}>＋ Evento</button>
      </div>
      {events.length
        ? <BusyList blocks={events} onEdit={b => open.busy(b)} describe={b => `${longDate(b.date)}, ${b.from} a ${b.to}${b.reminder != null ? ' 🔔' : ''}${b.syncCalendar ? ' 📲' : ''}`} />
        : <p className="sub">No tienes eventos próximos.</p>}

      <div className="spread section-gap">
        <div>
          <h2 className="title">Horario semanal</h2>
          <p className="sub tight">Clases y trabajo que se repiten cada semana.</p>
        </div>
        <button className="btn" onClick={() => open.busy(null)}>＋ Añadir</button>
      </div>
      {weekly.length
        ? <BusyList blocks={weekly} onEdit={b => open.busy(b)} describe={b => `${WEEK.filter(d => b.days.includes(d)).map(d => DOW_SHORT[d]).join(' ')}, ${b.from} a ${b.to}`} />
        : <p className="sub">Sin horario semanal.</p>}

      <div className="section-gap">
        <SettingsPanel settings={settings} toast={toast} onChange={changes => act(() => api.updateSettings(changes), 'Ajuste guardado.')} />
      </div>
    </div>
  );
}
