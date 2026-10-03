import { useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { REPEATING } from '../lib/catalog.js';
import { todayStr, addDays } from '../lib/format.js';

/**
 * Pausa (vacaciones): fechas y lista de tareas. Por defecto se marcan todas;
 * quita el check a las que quieras seguir haciendo.
 */
export default function PauseForm({ pause, onSave, onDelete, onClose }) {
  const today = todayStr();
  const { data: tasks } = useQuery(() => api.tasks(), []);
  const repeating = (tasks ?? []).filter(t => REPEATING.includes(t.freq.type));

  const [form, setForm] = useState(() => pause
    ? { label: pause.label, from: pause.from, to: pause.to, taskIds: pause.taskIds }
    : { label: 'Vacaciones', from: today, to: addDays(today, 6), taskIds: null });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // En una pausa nueva, todas marcadas hasta que el usuario toque algo
  const selected = form.taskIds ?? repeating.map(t => t.id);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const toggle = id => set('taskIds', selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const started = pause && pause.from < today;

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    const err = await onSave({ label: form.label, from: form.from, to: form.to, taskIds: selected });
    setSaving(false);
    setError(err);
  };

  return (
    <Sheet title={pause ? 'Editar pausa' : 'Nueva pausa'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="p-label">Nombre</label>
          <input id="p-label" type="text" maxLength={30} value={form.label} placeholder="Vacaciones, exámenes..." onChange={e => set('label', e.target.value)} />
        </div>

        <div className="two">
          <div className="field">
            <label htmlFor="p-from">Desde</label>
            <input id="p-from" type="date" value={form.from} min={started ? undefined : today} disabled={started}
              onChange={e => set('from', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p-to">Hasta (incluido)</label>
            <input id="p-to" type="date" value={form.to} min={form.from > today ? form.from : today} onChange={e => set('to', e.target.value)} />
          </div>
        </div>
        {started && <p className="hint">La pausa ya ha empezado: solo puedes cambiar hasta cuándo dura.</p>}

        <div className="field">
          <div className="spread">
            <span className="lbl">Tareas en pausa</span>
            <div className="row">
              <button type="button" className="btn ghost sm" onClick={() => set('taskIds', repeating.map(t => t.id))}>Todas</button>
              <button type="button" className="btn ghost sm" onClick={() => set('taskIds', [])}>Ninguna</button>
            </div>
          </div>
          <p className="hint">Quita el check a las que quieras seguir haciendo durante la pausa.</p>
          {!tasks && <p className="sub">Cargando…</p>}
          <div className="checklist">
            {repeating.map(t => (
              <label key={t.id} className="check-row">
                <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
                <span className="check-box" aria-hidden="true" />
                <span className="check-icon" aria-hidden="true">{t.icon}</span>
                <span className="check-name">{t.name}</span>
                <span className="check-state">{selected.includes(t.id) ? 'En pausa' : 'Activa'}</span>
              </label>
            ))}
          </div>
          {tasks && !repeating.length && <p className="sub">No tienes tareas que se repitan.</p>}
          <p className="hint">Las tareas de una vez y las sin fecha no se pausan.</p>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="actions">
          {pause && <button type="button" className="btn danger" onClick={onDelete}>Quitar pausa</button>}
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving}>{pause ? 'Guardar' : 'Crear pausa'}</button>
        </div>
      </form>
    </Sheet>
  );
}
