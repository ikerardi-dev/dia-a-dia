/**
 * Horario ocupado (se repite cada semana: clase, trabajo) y
 * eventos (un día concreto: pádel, cita). Los eventos pueden avisar antes
 * y enviarse al calendario del móvil.
 */
import { busyRepository } from '../repositories/busyRepository.js';
import { assert } from '../utils/errors.js';
import { toMin } from '../utils/dates.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const REMINDER_OPTIONS = [5, 10, 15, 30, 60, 120, 1440];

export function validateBusy(data) {
  const label = String(data.label ?? '').trim() || 'Ocupado';
  assert(label.length <= 30, 'LABEL_TOO_LONG', 'El nombre puede tener como mucho 30 caracteres.');
  assert(TIME_RE.test(data.from) && TIME_RE.test(data.to), 'INVALID_TIME', 'Revisa las horas.');
  assert(toMin(data.to) > toMin(data.from), 'INVALID_RANGE', 'La hora de fin tiene que ser posterior a la de inicio.');

  const reminder = data.reminder == null || data.reminder === '' ? null : Number(data.reminder);
  assert(reminder === null || REMINDER_OPTIONS.includes(reminder), 'INVALID_REMINDER', 'El aviso no es válido.');

  const base = { label, icon: data.icon || '📅', from: data.from, to: data.to };

  if (data.date) {
    assert(DATE_RE.test(data.date), 'INVALID_DATE', 'La fecha no es válida.');
    return { ...base, date: data.date, days: [], reminder, syncCalendar: !!data.syncCalendar };
  }
  const days = [...new Set((data.days ?? []).map(Number))].filter(d => d >= 0 && d <= 6);
  assert(days.length > 0, 'NO_DAYS', 'Elige al menos un día.');
  // Lo semanal no se envía al calendario del móvil ni avisa: es tu horario de siempre
  return { ...base, date: null, days, reminder: null, syncCalendar: false };
}

export const listBusy = () => busyRepository.findAll();
export const createBusy = data => busyRepository.create(validateBusy(data));
export const updateBusy = (id, data) => busyRepository.update(id, validateBusy(data));
export const deleteBusy = id => busyRepository.softDelete(id);

/** Eventos (con fecha) entre dos días, para el calendario */
export async function listEvents(from, to) {
  const blocks = await busyRepository.findAll();
  return blocks.filter(b => b.date && b.date >= from && b.date <= to);
}
