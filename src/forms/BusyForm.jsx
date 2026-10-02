import { useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import OptionChips from '../components/OptionChips.jsx';
import IconPicker from '../components/IconPicker.jsx';
import { BUSY_ICONS, BUSY_SUGGESTIONS } from '../lib/catalog.js';
import { WEEK, DOW_SHORT, todayStr } from '../lib/format.js';

const REPEAT = [
  { value: 'once', label: 'Un día concreto' },
  { value: 'weekly', label: 'Cada semana' }
];

export default function BusyForm({ block, presetDate, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => block
    ? { ...block, repeat: block.date ? 'once' : 'weekly', date: block.date ?? todayStr(), days: block.days.length ? block.days : [1, 2, 3, 4, 5] }
    : { label: '', icon: BUSY_ICONS[0], from: '09:00', to: '14:00', repeat: presetDate ? 'once' : 'weekly', date: presetDate ?? todayStr(), days: [1, 2, 3, 4, 5] });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    const err = await onSave({
      label: form.label,
      icon: form.icon,
      from: form.from,
      to: form.to,
      date: form.repeat === 'once' ? form.date : null,
      days: form.repeat === 'weekly' ? form.days : []
    });
    setSaving(false);
    setError(err);
  };

  return (
    <Sheet title={block ? 'Editar horario ocupado' : 'Horario ocupado'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="b-label">Qué es</label>
          <input id="b-label" type="text" list="b-suggestions" maxLength={30} value={form.label} placeholder="Clase, trabajo, médico..." onChange={e => set('label', e.target.value)} />
          <datalist id="b-suggestions">{BUSY_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
        </div>

        <div className="field">
          <span className="lbl">Icono</span>
          <IconPicker icons={BUSY_ICONS} value={form.icon} onChange={v => set('icon', v)} />
        </div>

        <div className="field">
          <span className="lbl">Cuándo</span>
          <OptionChips name="repeat" options={REPEAT} value={form.repeat} onChange={v => set('repeat', v)} />
          {form.repeat === 'once'
            ? <input type="date" aria-label="Fecha" value={form.date} onChange={e => set('date', e.target.value)} />
            : <OptionChips name="days" multiple options={WEEK.map(d => ({ value: d, label: DOW_SHORT[d] }))} value={form.days} onChange={v => set('days', v)} />}
        </div>

        <div className="two">
          <div className="field">
            <label htmlFor="b-from">Desde</label>
            <input id="b-from" type="time" value={form.from} onChange={e => set('from', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="b-to">Hasta</label>
            <input id="b-to" type="time" value={form.to} onChange={e => set('to', e.target.value)} />
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="actions">
          {block && <button type="button" className="btn danger" onClick={onDelete}>Eliminar</button>}
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving}>Guardar</button>
        </div>
      </form>
    </Sheet>
  );
}
