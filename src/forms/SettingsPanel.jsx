import { useEffect, useState } from 'react';
import NotificationSettings from './NotificationSettings.jsx';
import { MAX_TASK_TIME } from '../lib/catalog.js';

const PENALTIES = [25, 50, 75, 100];

/** Ajustes generales. Cada cambio se guarda al momento. */
export default function SettingsPanel({ settings, onChange, toast }) {
  const [local, setLocal] = useState(settings);
  useEffect(() => setLocal(settings), [settings]);

  const update = async (key, value) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    const res = await onChange({ [key]: value });
    if (!res.ok) setLocal(settings); // vuelve al valor guardado si no era válido
    return res;
  };

  return (
    <section className="card stack">
      <h2 className="card-title">Ajustes</h2>
      <div className="two">
        <div className="field">
          <label htmlFor="s-wake">Empiezo el día a las</label>
          <input id="s-wake" type="time" value={local.wake} onChange={e => update('wake', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s-sleep">Termino el día a las</label>
          <input id="s-sleep" type="time" value={local.sleep} onChange={e => update('sleep', e.target.value)} />
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="s-pen">Si no hago una tarea, resto</label>
          <select id="s-pen" value={local.penaltyPct} onChange={e => update('penaltyPct', Number(e.target.value))}>
            {PENALTIES.map(p => <option key={p} value={p}>{p}% de sus puntos</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="s-wild">Comodines por semana</label>
          <select id="s-wild" value={local.wildcardsPerWeek} onChange={e => update('wildcardsPerWeek', Number(e.target.value))}>
            {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n === 0 ? 'Ninguno' : n}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="s-max">Tiempo máximo de tareas al día</label>
        <select id="s-max" value={local.maxTaskMinutes} onChange={e => update('maxTaskMinutes', Number(e.target.value))}>
          {MAX_TASK_TIME.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <p className="hint">Si un día se pasa, las tareas flexibles se mueven solas a otro día con hueco. Las diarias, las de hora fija y las aplazadas no se mueven.</p>
      </div>
      <NotificationSettings enabled={local.notify} onToggle={value => update('notify', value)} toast={toast} />
      <p className="version">Día a Día {__APP_VERSION__}</p>
    </section>
  );
}
