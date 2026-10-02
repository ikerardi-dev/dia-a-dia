import { useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import OptionChips from '../components/OptionChips.jsx';
import IconPicker from '../components/IconPicker.jsx';
import Toggle from '../components/Toggle.jsx';
import { phoneCalendarSupported, ensureCalendarPermission } from '../lib/phoneCalendar.js';
import { TASK_ICONS, PREFS, POINT_PRESETS, DURATIONS, FREQS } from '../lib/catalog.js';
import { WEEK, DOW_SHORT, todayStr } from '../lib/format.js';

const empty = () => ({
  name: '', icon: TASK_ICONS[0], points: 10,
  freq: { type: 'daily', every: 2, days: [1, 3, 5] },
  pref: 'tarde', time: '', duration: 30, startDate: todayStr()
});

export default function TaskForm({ task, onSave, onDelete, onClose, toast }) {
  const initial = task
    ? { ...task, freq: { type: task.freq.type, every: task.freq.every ?? 2, days: task.freq.days.length ? task.freq.days : [1, 3, 5] }, startDate: task.startDate }
    : empty();
  const [form, setForm] = useState(initial);
  const [customPoints, setCustomPoints] = useState(!POINT_PRESETS.some(p => p.value === initial.points));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const type = form.freq.type;
  const today = todayStr();
  const setFreq = (key, value) => setForm(f => ({ ...f, freq: { ...f.freq, [key]: value } }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    const err = await onSave({
      name: form.name,
      icon: form.icon,
      points: Number(form.points),
      freq: { type: form.freq.type, every: Number(form.freq.every), days: form.freq.days },
      pref: form.pref,
      time: form.time,
      duration: Number(form.duration),
      startDate: form.startDate,
      syncCalendar: type === 'once' && !!form.syncCalendar
    });
    setSaving(false);
    setError(err);
  };

  return (
    <Sheet title={task ? 'Editar tarea' : 'Nueva tarea'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="t-name">Nombre</label>
          <input id="t-name" type="text" maxLength={40} value={form.name} placeholder="Por ejemplo, fregar los platos" onChange={e => set('name', e.target.value)} />
        </div>

        <div className="field">
          <span className="lbl">Icono</span>
          <IconPicker icons={TASK_ICONS} value={form.icon} onChange={v => set('icon', v)} />
        </div>

        <div className="field">
          <span className="lbl">Puntos</span>
          <OptionChips
            name="points"
            options={[...POINT_PRESETS, { value: 'custom', label: 'Otra' }]}
            value={customPoints ? 'custom' : form.points}
            onChange={v => {
              if (v === 'custom') { setCustomPoints(true); return; }
              setCustomPoints(false);
              set('points', v);
            }}
          />
          {customPoints && (
            <input type="number" min={1} max={500} value={form.points} aria-label="Puntos personalizados" onChange={e => set('points', e.target.value)} />
          )}
        </div>

        <div className="field">
          <span className="lbl">Frecuencia</span>
          <OptionChips name="freq" options={FREQS} value={form.freq.type} onChange={v => setFreq('type', v)} />
          {form.freq.type === 'interval' && (
            <>
              <label className="hint" htmlFor="t-every">Cada cuántos días</label>
              <input id="t-every" type="number" min={2} max={30} value={form.freq.every} onChange={e => setFreq('every', e.target.value)} />
            </>
          )}
          {form.freq.type === 'weekdays' && (
            <OptionChips
              name="days"
              multiple
              options={WEEK.map(d => ({ value: d, label: DOW_SHORT[d] }))}
              value={form.freq.days}
              onChange={v => setFreq('days', v)}
            />
          )}
        </div>

        {type !== 'anytime' && (
          <div className="field">
            <label htmlFor="t-start">{type === 'once' ? 'Qué día' : 'Empieza el'}</label>
            <input
              id="t-start"
              type="date"
              min={task?.startDate && task.startDate < today ? task.startDate : today}
              value={form.startDate}
              onChange={e => set('startDate', e.target.value)}
            />
          </div>
        )}

        {type === 'anytime' ? (
          <p className="hint">Aparecerá en Hoy, en "Cuando puedas". No resta puntos si pasan los días y suma el día que la hagas.</p>
        ) : (
          <div className="field">
            <span className="lbl">Mejor momento</span>
            <OptionChips name="pref" options={PREFS} value={form.pref} onChange={v => set('pref', v)} />
          </div>
        )}

        <div className="two">
          {type !== 'anytime' && (
            <div className="field">
              <label htmlFor="t-time">Hora fija (opcional)</label>
              <input id="t-time" type="time" value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="t-dur">{type === 'anytime' ? 'Duración aproximada' : 'Duración'}</label>
            <select id="t-dur" value={form.duration} onChange={e => set('duration', Number(e.target.value))}>
              {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
        </div>

        {type === 'once' && phoneCalendarSupported() && (
          <Toggle
            id="t-sync"
            label="Añadir al calendario del móvil"
            hint={form.time ? 'Se añade a su hora.' : 'Sin hora fija se añade como evento de todo el día.'}
            checked={!!form.syncCalendar}
            onBeforeEnable={async () => {
              const ok = await ensureCalendarPermission();
              if (!ok) toast('Android no ha dado permiso para el calendario. Actívalo en Ajustes > Apps > Día a Día > Permisos.', 6000);
              return ok;
            }}
            onChange={v => set('syncCalendar', v)}
          />
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="actions">
          {task && <button type="button" className="btn danger" onClick={onDelete}>Eliminar</button>}
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving}>{task ? 'Guardar cambios' : 'Crear tarea'}</button>
        </div>
      </form>
    </Sheet>
  );
}
