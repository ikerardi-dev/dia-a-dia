import { useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import OptionChips from '../components/OptionChips.jsx';
import IconPicker from '../components/IconPicker.jsx';
import Toggle from '../components/Toggle.jsx';
import { BUSY_ICONS, BUSY_SUGGESTIONS, REMINDERS } from '../lib/catalog.js';
import { WEEK, DOW_SHORT, todayStr } from '../lib/format.js';
import { phoneCalendarSupported, ensureCalendarPermission } from '../lib/phoneCalendar.js';

const REPEAT = [
  { value: 'once', label: 'Un día concreto (evento)' },
  { value: 'weekly', label: 'Cada semana' }
];

export default function BusyForm({ block, presetDate, onSave, onDelete, onClose, toast }) {
  const [form, setForm] = useState(() => block
    ? { ...block, repeat: block.date ? 'once' : 'weekly', date: block.date ?? todayStr(), days: block.days.length ? block.days : [1, 2, 3, 4, 5], reminder: block.reminder ?? '' }
    : { label: '', icon: presetDate ? '⚽' : BUSY_ICONS[0], from: presetDate ? '19:00' : '09:00', to: presetDate ? '20:00' : '14:00',
        repeat: presetDate ? 'once' : 'weekly', date: presetDate ?? todayStr(), days: [1, 2, 3, 4, 5], reminder: '', syncCalendar: false });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const isEvent = form.repeat === 'once';

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    const err = await onSave({
      label: form.label,
      icon: form.icon,
      from: form.from,
      to: form.to,
      date: isEvent ? form.date : null,
      days: isEvent ? [] : form.days,
      reminder: isEvent && form.reminder !== '' ? Number(form.reminder) : null,
      syncCalendar: isEvent && !!form.syncCalendar
    });
    setSaving(false);
    setError(err);
  };

  const askCalendar = async () => {
    const ok = await ensureCalendarPermission();
    if (!ok) toast('Android no ha dado permiso para el calendario. Actívalo en Ajustes > Apps > Día a Día > Permisos.', 6000);
    return ok;
  };

  const title = block ? (isEvent ? 'Editar evento' : 'Editar horario') : (isEvent ? 'Nuevo evento' : 'Horario ocupado');

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="b-label">Qué es</label>
          <input id="b-label" type="text" list="b-suggestions" maxLength={30} value={form.label}
            placeholder={isEvent ? 'Partido de pádel, cumpleaños...' : 'Clase, trabajo...'} onChange={e => set('label', e.target.value)} />
          <datalist id="b-suggestions">{BUSY_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
        </div>

        <div className="field">
          <span className="lbl">Icono</span>
          <IconPicker icons={BUSY_ICONS} value={form.icon} onChange={v => set('icon', v)} />
        </div>

        <div className="field">
          <span className="lbl">Cuándo</span>
          <OptionChips name="repeat" options={REPEAT} value={form.repeat} onChange={v => set('repeat', v)} />
          {isEvent
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

        {isEvent && (
          <>
            <div className="field">
              <label htmlFor="b-rem">Avisarme</label>
              <select id="b-rem" value={form.reminder} onChange={e => set('reminder', e.target.value)}>
                {REMINDERS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {phoneCalendarSupported() && (
              <Toggle
                id="b-sync"
                label="Añadir al calendario del móvil"
                hint="Lo verás en Google Calendar y te avisará también desde allí."
                checked={!!form.syncCalendar}
                onBeforeEnable={askCalendar}
                onChange={v => set('syncCalendar', v)}
              />
            )}
          </>
        )}

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
