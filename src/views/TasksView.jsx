import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { PREF_LABEL } from '../lib/catalog.js';
import { WEEK, DOW_SHORT, longDate } from '../lib/format.js';
import SettingsPanel from '../forms/SettingsPanel.jsx';

export default function TasksView({ version, act, open, toast }) {
  const { data } = useQuery(() => Promise.all([api.tasks(), api.busy(), api.settings()]), [version]);
  if (!data) return <p className="loading">Cargando…</p>;
  const [tasks, busy, settings] = data;

  return (
    <div className="stack">
      <div className="spread">
        <h2 className="title">Tus tareas</h2>
        <button className="btn primary" onClick={() => open.task(null)}>＋ Nueva tarea</button>
      </div>

      <div className="tlist">
        {tasks.map(t => (
          <div key={t.id} className="task">
            <div className="ic" aria-hidden="true">{t.icon}</div>
            <div className="body">
              <div className="name">{t.name}</div>
              <div className="meta">{t.freqLabel}, {t.time ? `a las ${t.time}` : PREF_LABEL[t.pref].toLowerCase()}, {t.duration} min</div>
            </div>
            <div className="pts">+{t.points}</div>
            <button className="btn ghost sm" onClick={() => open.task(t)}>Editar</button>
          </div>
        ))}
        {!tasks.length && (
          <div className="card empty-state">
            <p className="sub">Aún no tienes tareas.</p>
            <button className="btn" onClick={() => act(api.loadExampleTasks, 'Tareas de ejemplo cargadas.')}>Cargar tareas de ejemplo</button>
          </div>
        )}
      </div>

      <div className="spread section-gap">
        <div>
          <h2 className="title">Horario ocupado</h2>
          <p className="sub tight">Clases, trabajo y citas. Las tareas se colocan en los huecos libres.</p>
        </div>
        <button className="btn" onClick={() => open.busy(null)}>＋ Añadir</button>
      </div>

      <div className="tlist">
        {busy.map(b => (
          <div key={b.id} className="task busy">
            <div className="ic" aria-hidden="true">{b.icon}</div>
            <div className="body">
              <div className="name">{b.label}</div>
              <div className="meta">
                {b.date ? longDate(b.date) : WEEK.filter(d => b.days.includes(d)).map(d => DOW_SHORT[d]).join(' ')}, {b.from} a {b.to}
              </div>
            </div>
            <button className="btn ghost sm" onClick={() => open.busy(b)}>Editar</button>
          </div>
        ))}
        {!busy.length && <p className="sub">Sin horarios ocupados.</p>}
      </div>

      <div className="section-gap">
        <SettingsPanel settings={settings} toast={toast} onChange={changes => act(() => api.updateSettings(changes), 'Ajuste guardado.')} />
      </div>
    </div>
  );
}
